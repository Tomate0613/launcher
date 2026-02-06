<script lang="ts" setup>
import { capitalize, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import type {
  ContentItem,
  ContentState,
  ContentType,
} from '../../../main/data/content/content';
import { ImplementedProvider, SearchResult, Version } from 'tomate-mods';
import ContentItemCard from '../components/ContentItemCard.vue';
import SplitButton from '../components/SplitButton.vue';
import ContentVersionPicker from '../components/ContentVersionPicker.vue';
import ContentItemCardShimmer from '../components/ContentItemCardShimmer.vue';
import { useSyncedIdSet } from '../composables/syncedIdSet';
import { useDebounceFn, watchIgnorable } from '@vueuse/core';
import Icon from '../components/Icon.vue';
import { mdiFilter, mdiLoading, mdiUpdate } from '@mdi/js';
import DialogButton from '../components/DialogButton.vue';
import Toggle from '../components/Toggle.vue';
import { forEachDroppedFile } from '../files';

const route = useRoute();
const modpackId = route.params.id as string;
const contentType = route.params.contentType as ContentType;
const content = await useSyncedIdSet<ContentItem>(
  `${modpackId}-${contentType}`,
);

const searchResult = ref<SearchResult & { shimmer?: boolean }>({
  hits: [],
  count: 0,
  shimmer: true,
});
const installedSearchQuery = ref('');

async function install(provider: ImplementedProvider, projectId: string) {
  return window.api.invoke(
    'installContent',
    modpackId,
    contentType,
    provider,
    projectId,
  );
}

async function installVersion(provider: ImplementedProvider, version: Version) {
  return window.api.invoke(
    'installContentVersion',
    modpackId,
    contentType,
    provider,
    version,
  );
}

async function changeVersionLatest(
  id: string,
  provider: ImplementedProvider,
  projectId: string,
) {
  return window.api.invoke(
    'replaceContentVersionLatest',
    modpackId,
    contentType,
    id,
    provider,
    projectId,
  );
}

async function changeVersion(
  id: string,
  provider: ImplementedProvider,
  version: Version,
) {
  return window.api.invoke(
    'replaceContentVersion',
    modpackId,
    contentType,
    id,
    provider,
    version,
  );
}

function remove(id: string) {
  return window.api.invoke('removeContent', modpackId, contentType, id);
}

function toggleDisabled(id: string) {
  return window.api.invoke('toggleContentDisabled', modpackId, contentType, id);
}

const input = useTemplateRef('input');

async function search() {
  const query = input.value?.value ?? '';

  searchResult.value = await window.api.invoke(
    'searchContent',
    modpackId,
    contentType,
    query,
  );
}

const searchDebounced = useDebounceFn(search, 500);

async function onDrop(event: DragEvent) {
  forEachDroppedFile(event, (name, buffer) => {
    window.api.invoke('importContent', modpackId, contentType, name, buffer);
  });
}

onMounted(() => {
  search();
  window.api.invoke(
    'updateContentFromFiles',
    route.params.id as string,
    contentType,
  );
});

function installStateString(state?: ContentState) {
  if (state == 'INSTALLED') {
    return 'Installed';
  }
  if (state == 'INSTALLING') {
    return 'Installing';
  }

  return 'Install';
}

function installStateDisabled(state?: ContentState) {
  if (state == 'REMOVED' || !state) {
    return false;
  }

  return true;
}

const updateState = ref<'idle' | 'checking'>('idle');

async function checkUpdates() {
  if (updateState.value === 'checking') {
    return;
  }

  updateState.value = 'checking';

  const versionPromises = Array.from(content.value.values()).map(
    async (mod) => {
      if (
        mod.provider === 'custom' ||
        mod.provider === 'unknown' ||
        !mod.project
      ) {
        return { mod, versions: [] as Version[] };
      }

      const versions = await window.api
        .invoke(
          'contentVersions',
          modpackId,
          contentType,
          mod.provider,
          mod.project.id,
        )
        .catch((_) => [] as Version[]);
      return { mod, versions };
    },
  );

  const versions = await Promise.all(versionPromises);

  updateable.value = versions.filter(
    ({ versions, mod }) => versions.length > 0 && versions[0].id != mod.id,
  );

  selectInstalledFilterUpdate.value = true;

  updateState.value = 'idle';
}

const updateable = ref<{ mod: ContentItem; versions: Version[] }[]>([]);

function hasUpdate(item: ContentItem) {
  if (!item.version) {
    return false;
  }

  const update = updateable.value.find((a) => a.mod.id === item.id);
  if (!update) {
    return false;
  }

  return update.versions.length > 0 && update.versions[0].id != item.version.id;
}

function installedSearchMatch(item: ContentItem) {
  const lowercaseQuery = installedSearchQuery.value.toLowerCase();
  const words = lowercaseQuery.split(' ');
  const query = words
    .filter((word) => !word.startsWith('is:') && !word.startsWith('has:'))
    .join(' ');

  if (
    selectInstalledFilterState.value !== 'all' &&
    item.state.toLowerCase() !== selectInstalledFilterState.value
  ) {
    return false;
  }

  if (
    selectInstalledFilterDisabled.value !== 'both' &&
    (item.disabled ? 'disabled' : 'enabled') !==
      selectInstalledFilterDisabled.value
  ) {
    return false;
  }

  if (selectInstalledFilterUpdate.value && !hasUpdate(item)) {
    return false;
  }

  return (
    item.project?.name.toLowerCase().includes(query) ||
    item.id.toLowerCase().includes(query)
  );
}

const states: Lowercase<ContentState>[] = [
  'installing',
  'removed',
  'installed',
  'checking',
];

const disabledFilterStates = ['disabled', 'enabled'] as const;

// const disabled = ''

const selectInstalledFilterState = ref<(typeof states)[number] | 'all'>('all');
const selectInstalledFilterDisabled = ref<
  (typeof disabledFilterStates)[number] | 'both'
>('both');
const selectInstalledFilterUpdate = ref(false);

const { ignoreUpdates } = watchIgnorable(
  [
    selectInstalledFilterState,
    selectInstalledFilterDisabled,
    selectInstalledFilterUpdate,
  ],
  () => {
    const query = installedSearchQuery.value;
    const words = query.split(' ');
    let newQuery = words
      .filter((word) => !word.startsWith('is:') && !word.startsWith('has:'))
      .join(' ');

    if (selectInstalledFilterState.value !== 'all') {
      newQuery = `is:${selectInstalledFilterState.value} ${newQuery}`;
    }

    if (selectInstalledFilterDisabled.value !== 'both') {
      newQuery = `is:${selectInstalledFilterDisabled.value} ${newQuery}`;
    }

    if (selectInstalledFilterUpdate.value) {
      newQuery = `has:update ${newQuery}`;

      if (updateable.value.length === 0) {
        checkUpdates();
      }
    }

    installedSearchQuery.value = newQuery;
  },
);

function urlFor(item: ContentItem) {
  if (item.provider === 'modrinth' && item.project) {
    return `https://modrinth.com/project/${item.project?.id}`;
  }
  if (item.provider === 'curseforge' && item.project) {
    return `https://www.curseforge.com/minecraft/mc-mods/${item.project?.slug}`;
  }

  return undefined;
}

watch(installedSearchQuery, (q) => {
  ignoreUpdates(() => {
    const lowercaseQuery = q.toLowerCase();
    const words = lowercaseQuery.split(' ');

    selectInstalledFilterState.value =
      states.find((state) => words.includes(`is:${state}`)) ?? 'all';
    selectInstalledFilterDisabled.value =
      disabledFilterStates.find((state) => words.includes(`is:${state}`)) ??
      'both';
    selectInstalledFilterUpdate.value = words.includes('has:update');
  });
});
</script>

<template>
  <div class="page-header">
    <div class="search-bars">
      <div>
        <input
          type="search"
          v-model="installedSearchQuery"
          :placeholder="`Search ${contentType}`"
        />
        <DialogButton>
          <Icon :path="mdiFilter" />
          <template v-slot:dialog>
            <select v-model="selectInstalledFilterState">
              <option value="all">All</option>
              <option v-for="state in states" :value="state">
                {{ capitalize(state) }}
              </option>
            </select>
            <select v-model="selectInstalledFilterDisabled">
              <option value="both">Both</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
            <label class="inline-label" v-if="updateable.length > 0">
              Update
              <Toggle v-model="selectInstalledFilterUpdate" />
            </label>
          </template>
        </DialogButton>
        <button
          class="icon-btn"
          @click="checkUpdates"
          :disabled="updateState === 'checking'"
        >
          <Icon
            :path="updateState === 'idle' ? mdiUpdate : mdiLoading"
            :spin="updateState === 'checking'"
          />
        </button>
      </div>
      <div>
        <input
          type="search"
          @input="searchDebounced"
          ref="input"
          :placeholder="`Search ${contentType}`"
        />
        <button class="icon-btn" disabled>
          <Icon :path="mdiFilter" />
        </button>
      </div>
    </div>
  </div>

  <div class="page-content" @dragover.prevent.stop @drop.prevent="onDrop">
    <div class="page-scrollable installed-content">
      <ContentItemCard
        v-for="item in Array.from(content.values()).filter((item) =>
          installedSearchMatch(item),
        )"
        :disabled="item.disabled"
        :name="item.project?.name ?? item.id"
        :description="item.project?.description ?? ''"
        :provider="item.provider"
        :icon="item.project?.icon"
        :state="item.state"
        :stateProgress="item.stateProgress"
        :url="urlFor(item)"
        :key="item.id"
      >
        <button
          class="icon-btn"
          v-if="item.project && hasUpdate(item)"
          @click="
            changeVersionLatest(
              item.id,
              item.provider as never,
              item.project.id,
            )
          "
        >
          Update
        </button>
        <SplitButton @click="remove(item.id)">
          Remove

          <template v-slot:options>
            <button
              @click="toggleDisabled(item.id)"
              :disabled="item.state === 'REMOVED'"
              :title="
                item.state === 'REMOVED'
                  ? 'Can not disable, because the file is missing'
                  : undefined
              "
            >
              {{ item.disabled ? 'Enable' : 'Disable' }}
            </button>

            <ContentVersionPicker
              v-if="
                item.provider != 'unknown' &&
                item.provider != 'custom' &&
                item.project
              "
              :modpackId="modpackId"
              :providerId="item.provider"
              :content-type="contentType"
              :projectId="item.project.id"
              @choose-latest="
                changeVersionLatest(item.id, item.provider, item.project.id)
              "
              @choose-version="
                (version) =>
                  changeVersion(item.id, item.provider as never, version)
              "
            />
          </template>
        </SplitButton>
      </ContentItemCard>
    </div>
    <div class="page-scrollable searched-content">
      <ContentItemCardShimmer v-if="searchResult.shimmer" v-for="_ in 20" />
      <ContentItemCard
        v-for="mod in searchResult.hits"
        :name="mod.name"
        :description="mod.description"
        :icon="mod.icon"
        :provider="mod.provider"
        :url="mod.url"
        state="SEARCH"
      >
        <SplitButton
          @click="install(mod.provider, mod.id)"
          :disabled="
            installStateDisabled(
              Array.from(content.values()).find((a) => a.project?.id == mod.id)
                ?.state,
            )
          "
        >
          {{
            installStateString(
              Array.from(content.values()).find((a) => a.project?.id == mod.id)
                ?.state,
            )
          }}

          <template v-slot:options>
            <ContentVersionPicker
              :modpackId="modpackId"
              :content-type="contentType"
              :providerId="mod.provider"
              :projectId="mod.id"
              @choose-latest="install(mod.provider, mod.id)"
              @choose-version="
                (version) => installVersion(mod.provider, version)
              "
            />
          </template>
        </SplitButton>
      </ContentItemCard>
    </div>
  </div>
</template>

<style scoped>
.search-bars {
  display: grid;
  grid-template-columns: 1fr 1fr;

  gap: 2rem;

  & > div {
    display: flex;
    flex-grow: 1;
    gap: 0.5rem;
  }

  & input[type='search'] {
    display: flex;
    flex-grow: 1;
  }
}

.page-scrollable {
  gap: 0.5rem;
}

.inline-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
