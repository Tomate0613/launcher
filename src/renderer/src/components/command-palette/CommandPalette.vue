<script setup lang="ts">
import { useMagicKeys, whenever } from '@vueuse/core';
import CommandPaletteContent from './CommandPaletteContent.vue';
import {
  computed,
  ComputedRef,
  effectScope,
  type EffectScope,
  getCurrentInstance,
  onMounted,
  ref,
  useTemplateRef,
  watchEffect,
} from 'vue';
import type { Action, Option } from './types';
import { AppState, useAppState } from '../../composables/appState';
import { useRouter } from 'vue-router';
import type {
  ContentItem,
  ContentType,
} from '../../../../main/data/content/content';
import {
  mdiLightbulbOnOutline,
  mdiPackageVariantClosed,
  mdiPaletteSwatchOutline,
} from '@mdi/js';
import { useSyncedIdSet } from '../../composables/syncedIdSet';
import { ModpackData } from '../../../../main/data/modpack';
import { setCommandPaletteInstance } from '../../composables/commandPalette';
import { log } from '../../../../common/logging/log';

const logger = log('command-palette');

const commandPalette = useTemplateRef('dialog');

const router = useRouter();
const keys = useMagicKeys();

const open = ref(false);

let scope: EffectScope | null = null;
const options = ref<Option[]>([]);
const commandPalettePlaceholder = ref('');

whenever(keys['Ctrl+K'], () => {
  if (!commandPalette.value?.open) {
    openInstances();
  }
});

function showPopup() {
  commandPalette.value?.showModal();
  open.value = true;
}

function showBasic(placeholder: string, opts: Option[]) {
  if (scope) {
    scope.stop();
  }

  commandPalettePlaceholder.value = placeholder;
  options.value = opts;

  showPopup();
}

function showComputed(placeholder: string, fn: () => ComputedRef<Option[]>) {
  commandPalettePlaceholder.value = placeholder;

  scoped(() => {
    const computedOptions = fn();

    watchEffect(() => {
      options.value = computedOptions.value;
    });
  });
  showPopup();
}

function showAsyncComputed(
  placeholder: string,
  fn: () => Promise<ComputedRef<Option[]>>,
) {
  commandPalettePlaceholder.value = placeholder;

  scoped(async () => {
    const computedOptions = await fn();

    watchEffect(() => {
      options.value = computedOptions.value;
    });
  });
  showPopup();
}

function scoped<T>(fn: () => T) {
  if (scope) {
    scope.stop();
  }
  scope = effectScope();
  return scope.run(fn);
}

type ActionProvider<T> = (item: T) => Action[] | false;

function openInstances() {
  return showAsyncComputed('Search Instances...', async () => {
    const appState = await useAppState();

    return forEachModpack(appState, (modpack) => [
      {
        name: 'Launch',
        execute() {
          return window.api.invoke(
            'launchModpack',
            modpack.id,
            appState.accountId!,
          );
        },
        disabled: !appState.accountId,
      },
      {
        name: 'Open Folder',
        execute() {
          return window.api.invoke('openModpackFolder', modpack.id);
        },
      },
      {
        name: 'Show Mods',
        execute() {
          router.push(`/${modpack.id}/mods`);
        },
        disabled: modpack.loader.id === 'vanilla',
      },
      {
        name: 'Show Shaderpacks',
        execute() {
          router.push(`/${modpack.id}/shaderpacks`);
        },
      },
      {
        name: 'Show Resourcepacks',
        execute() {
          router.push(`/${modpack.id}/resourcepacks`);
        },
      },
      {
        name: 'Settings',
        execute() {
          router.push(`/${modpack.id}/settings`);
        },
      },
      {
        name: 'Set Icon',
        execute() {
          setModpackIcon(modpack);
          return true;
        },
      },
    ]);
  });
}

type PossibleOption = Option | (Omit<Option, 'actions'> & { actions: false });

function forEachModpack(
  appState: AppState,
  actions: ActionProvider<ModpackData>,
): ComputedRef<Option[]> {
  return computed<Option[]>(() => {
    return Array.from(appState.modpacks.values())
      .filter((m) => !m.isDeleted)
      .sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0))
      .map<PossibleOption>((modpack) => ({
        name: modpack.name,
        image: modpack.icon ?? true,
        actions: actions(modpack),
      }))
      .filter((x): x is Option => x !== null);
  });
}

function forEachContentType(actions: ActionProvider<ContentType>): Option[] {
  const options: PossibleOption[] = [
    {
      name: 'Mods',
      icon: mdiPackageVariantClosed,
      actions: actions('mods'),
    },
    {
      name: 'Shaderpacks',
      icon: mdiLightbulbOnOutline,
      actions: actions('shaderpacks'),
    },
    {
      name: 'Resourcepacks',
      icon: mdiPaletteSwatchOutline,
      actions: actions('resourcepacks'),
    },
  ];
  return options.filter((a): a is Option => a.actions !== false);
}

async function forEachContent(
  modpackId: string,
  contentType: ContentType,
  actions: ActionProvider<ContentItem>,
): Promise<ComputedRef<Option[]>> {
  const id = `${modpackId}-${contentType}`;
  const set = await useSyncedIdSet<ContentItem>(id);
  return computed(() =>
    Array.from(set.value?.values() ?? [])
      .map<PossibleOption>((content) => ({
        name: content.project?.name ?? content.id,
        image: content.project?.icon,
        actions: actions(content),
      }))
      .filter((a): a is Option => a.actions !== false),
  );
}

function setModpackIconFromContentType(
  modpackId: string,
  contentType: ContentType,
) {
  showAsyncComputed('Select icon...', () =>
    forEachContent(modpackId, contentType, (content) =>
      content.project?.icon
        ? [
            {
              name: 'Set Icon',
              execute() {
                window.api.invoke(
                  'setModpackIconFromUrl',
                  modpackId,
                  content.project?.icon!,
                );
              },
            },
          ]
        : false,
    ),
  );
}

function setModpackIcon(modpack: ModpackData) {
  showBasic(
    'Select content type...',
    forEachContentType((contentType) =>
      contentType === 'mods' && modpack.loader.id === 'vanilla'
        ? false
        : [
            {
              name: 'Select',
              execute() {
                setModpackIconFromContentType(modpack.id, contentType);
                return true;
              },
            },
          ],
    ),
  );
}

function onClosed() {
  open.value = false;
  scope?.stop();
}

defineExpose();

onMounted(() => {
  setCommandPaletteInstance({ setModpackIconFromContentType });
});
</script>

<template>
  <dialog ref="dialog" @close="onClosed">
    <CommandPaletteContent
      v-if="open"
      :closeCommandPalette="() => commandPalette?.close()"
      :options="options"
      :placeholder="commandPalettePlaceholder"
    />
  </dialog>
</template>

<style scoped>
dialog {
  min-width: 50vw;
  outline: none;
  border: 1px solid var(--color-ui-layer);
  border-radius: 0.5rem;
  position: relative;

  padding: 0;
}
</style>
