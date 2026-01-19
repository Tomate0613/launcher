<script setup lang="ts">
import { onUnmounted, ref, useTemplateRef } from 'vue';
import Popup from '../Popup.vue';
import { SyncedIdSet } from '../../../../common/synced/synced-id-set/frontend';
import type {
  ContentItem,
  ContentType,
} from '../../../../main/data/content/content';
import Icon from '../Icon.vue';
import { mdiLoading } from '@mdi/js';
import ContentItemCard from '../ContentItemCard.vue';
import type { Version } from 'tomate-mods';
import { log } from '../../../../common/logging/log';

const logger = log('content-updater');

const popup = useTemplateRef('popup');

const { instanceId, contentType } = defineProps<{
  instanceId: string;
  contentType: ContentType;
}>();

const contentThatCanNotBeUpdated = ref<ContentItem[]>([]);
const content = ref<SyncedIdSet<ContentItem>>();
const state = ref<'checking' | 'missing' | 'updating' | 'done'>('checking');

let versions: { versions: Version[]; mod: ContentItem }[] = [];

onUnmounted(() => {
  cleanup();
});

function cleanup() {
  content.value?.cleanup();
}

async function checkMods() {
  popup.value?.openMenu();
  state.value = 'checking';

  cleanup();
  content.value = await SyncedIdSet.ofSynced<ContentItem>(
    `${instanceId}-${contentType}`,
  );

  try {
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
            instanceId,
            contentType,
            mod.provider,
            mod.project.id,
          )
          .catch((_) => [] as Version[]);
        return { mod, versions };
      },
    );

    versions = await Promise.all(versionPromises);
    const missing = versions
      .filter((version) => version.versions.length === 0)
      .map((a) => a.mod);

    contentThatCanNotBeUpdated.value = missing;

    if (missing.length) {
      state.value = 'missing';
    } else {
      update();
    }
  } finally {
  }
}

async function update() {
  state.value = 'updating';
  const w = await Promise.allSettled(
    // TODO Popup for failed shit and stuff
    versions.map(async (mod) => {
      if (
        mod.versions.length &&
        mod.mod.provider !== 'custom' &&
        mod.mod.provider !== 'unknown'
      ) {
        if (mod.mod.version?.id != mod.versions[0].id) {
          await window.api.invoke(
            'replaceContentVersion',
            instanceId,
            contentType,
            mod.mod.id,
            mod.mod.provider,
            mod.versions[0],
            false,
          );
        } else {
          logger.log(
            `Skipping ${mod.mod.id}, as its already on the latest version`,
          );
        }
      } else if (!mod.mod.disabled) {
        await window.api.invoke(
          'toggleContentDisabled',
          instanceId,
          contentType,
          mod.mod.id,
        );
      }
    }),
  );
  for (const a of w) {
    logger.log(a);
  }
  state.value = 'done';
  cleanup();
}

defineExpose({
  checkMods,
});
</script>

<template>
  <Popup ref="popup">
    <div v-if="state == 'checking'">
      <h2>Checking Updates</h2>

      <div class="spinner-container">
        <Icon :path="mdiLoading" :size="64" spin />
      </div>
    </div>
    <div v-if="state == 'missing'">
      <h2>Some {{ contentType }} can not be updated</h2>

      <div>
        The following {{ contentType }} can not be updated:
        <br />
        <br />

        <div class="content">
          <ContentItemCard
            v-for="item in contentThatCanNotBeUpdated"
            :name="item.project?.name ?? item.id"
            :description="item.project?.description ?? ''"
            :provider="item.provider"
            :icon="item.project?.icon"
            :state="item.state"
            :stateProgress="item.stateProgress"
            :key="item.id"
          />
        </div>
      </div>

      <hr />
      <div class="action-row">
        <button @click="update()">Disable and continue</button>
        <button @click="popup?.closeMenu()">Cancel</button>
      </div>
    </div>
    <div v-if="state == 'updating'">
      <h2>Updating</h2>
      <div class="content">
        <template
          v-for="item in Array.from(content?.values() ?? [])"
          :key="item.id"
        >
          <ContentItemCard
            v-if="versions.find(version => version.mod.id == item.id)?.versions.length"
            :name="item.project?.name ?? item.id"
            :description="item.project?.description ?? ''"
            :provider="item.provider"
            :icon="item.project?.icon"
            :state="item.state"
            :disabled="item.disabled"
            :stateProgress="item.stateProgress"
          >
          </ContentItemCard>
        </template>
      </div>
    </div>
    <div v-if="state === 'done'">
      <h2>Done</h2>
    </div>
  </Popup>
</template>

<style scoped>
.spinner-container {
  padding-top: 1rem;
  display: flex;

  align-items: center;
  justify-content: center;

  width: 100%;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
