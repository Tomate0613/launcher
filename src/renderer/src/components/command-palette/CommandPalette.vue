<script setup lang="ts">
import { useMagicKeys, whenever } from '@vueuse/core';
import CommandPaletteContent from './CommandPaletteContent.vue';
import {
  computed,
  ComputedRef,
  effectScope,
  type EffectScope,
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
  mdiCogOutline,
  mdiFolderOpenOutline,
  mdiImageOutline,
  mdiLightbulbOnOutline,
  mdiLink,
  mdiPackageVariantClosed,
  mdiPaletteSwatchOutline,
  mdiPlay,
} from '@mdi/js';
import { useSyncedIdSet } from '../../composables/syncedIdSet';
import { ModpackFrontendData } from '../../../../main/data/modpack';
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
const commandPaletteFooterText = ref<string | undefined>(undefined);

whenever(keys['Ctrl+K'], () => {
  if (!commandPalette.value?.open) {
    logger.verbose('Opening command palette');
    openInstances();
  }
});

function showPopup() {
  commandPalette.value?.showModal();
  open.value = true;
}

function showBasic(opts: Option[], placeholder: string, footerText?: string) {
  if (scope) {
    scope.stop();
  }

  commandPalettePlaceholder.value = placeholder;
  commandPaletteFooterText.value = footerText;
  options.value = opts;

  showPopup();
}

function showAsyncComputed(
  fn: () => Promise<ComputedRef<Option[]>>,
  placeholder: string,
  footerText?: string,
) {
  commandPalettePlaceholder.value = placeholder;
  commandPaletteFooterText.value = footerText;

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

type SimpleArg = Action & Omit<Option, 'actions'>;

function simpleOption(args: SimpleArg): Option {
  return {
    name: args.name,
    actions: [
      {
        name: args.name,
        execute: args.execute,
        disabled: args.disabled,
        keepAlive: args.keepAlive,
      },
    ],
    icon: args.icon,
    image: args.image,
  };
}

function openInstances() {
  return showAsyncComputed(async () => {
    const appState = await useAppState();

    return forEachModpack(
      appState,
      (modpack) => baseModpackOptions(modpack, appState.accountId),
      // (modpack) =>
      // (
      //   baseModpackOptions(
      //     modpack,
      //     appState.accountId,
      //   ) satisfies Action[] as Action[]
      // ).concat([
      //   {
      //     name: 'All Options',
      //     execute() {
      //       openInstanceOptions(modpack.id);
      //       return true;
      //     },
      //   },
      // ]),
    );
  }, 'Search Instances...');
}

function baseModpackOptions(modpack: ModpackFrontendData, accountId?: string) {
  return [
    {
      name: 'Launch',
      execute() {
        return window.api.invoke('launchModpack', modpack.id, accountId!);
      },
      disabled: !accountId,
      icon: mdiPlay,
    },
    {
      name: 'Open Folder',
      execute() {
        return window.api.invoke('openModpackFolder', modpack.id);
      },
      icon: mdiFolderOpenOutline,
    },
    {
      name: 'Show Mods',
      execute() {
        router.push(`/${modpack.id}/mods`);
      },
      disabled: modpack.loader.id === 'vanilla',
      icon: mdiPackageVariantClosed,
    },
    {
      name: 'Show Shaderpacks',
      execute() {
        router.push(`/${modpack.id}/shaderpacks`);
      },
      icon: mdiLightbulbOnOutline,
    },
    {
      name: 'Show Resourcepacks',
      execute() {
        router.push(`/${modpack.id}/resourcepacks`);
      },
      icon: mdiPaletteSwatchOutline,
    },
    {
      name: 'Set Icon',
      execute() {
        setModpackIcon(modpack);
        return true;
      },
      icon: mdiImageOutline,
    },
    {
      name: 'Settings',
      execute() {
        router.push(`/${modpack.id}/settings`);
      },
      icon: mdiCogOutline,
    },
    {
      name: 'Create Desktop Shortcut',
      execute() {
        return window.api.invoke('createModpackDesktopShortcut', modpack.id);
      },
      icon: mdiLink,
    },
  ] satisfies SimpleArg[];
}

// function openInstanceOptions(instanceId: string) {
//   return showAsyncComputed(
//     async () => {
//       const appState = await useAppState();
//       const modpack = appState.modpacks.get(instanceId);
//
//       return computed(() =>
//         modpack
//           ? baseModpackOptions(modpack, appState.accountId).map(simpleOption)
//           : [],
//       );
//     },
//     'Instance options...',
//     'Instance Options',
//   );
// }

type PossibleOption = Option | (Omit<Option, 'actions'> & { actions: false });

function forEachModpack(
  appState: AppState,
  actions: ActionProvider<ModpackFrontendData>,
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
  showAsyncComputed(
    () =>
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
    'Search icons...',
    'Select Icon',
  );
}

function setModpackIcon(modpack: ModpackFrontendData) {
  showBasic(
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
    'Search icon sources...',
    'Select Icon Source',
  );
}

function selectModpack(onSelect: (modpack: ModpackFrontendData) => void) {
  return showAsyncComputed(
    async () => {
      const appState = await useAppState();

      return forEachModpack(appState, (modpack) => [
        {
          name: 'Select',
          execute() {
            onSelect(modpack);
          },
        },
      ]);
    },
    'Search Instances...',
    'Select Instance',
  );
}

function onClosed() {
  open.value = false;
  scope?.stop();
}

onMounted(() => {
  setCommandPaletteInstance({ setModpackIconFromContentType, selectModpack });
});
</script>

<template>
  <dialog ref="dialog" @close="onClosed">
    <CommandPaletteContent
      v-if="open"
      :closeCommandPalette="() => commandPalette?.close()"
      :options="options"
      :placeholder="commandPalettePlaceholder"
      :footerText="commandPaletteFooterText"
    />
  </dialog>
</template>

<style scoped>
dialog {
  min-width: 50vw;
  outline: none;
  border: 1px solid var(--color-ui-layer);
  border-radius: var(--border-radius-strong);
  position: relative;

  padding: 0;
}
</style>
