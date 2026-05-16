<script setup lang="ts">
import { ImplementedProvider, Version } from 'tomate-mods';
import { ContentType } from '../../../main/data/content/content';
import { tryMountInvoke } from '../composables/mountInvoke';
import { toRaw } from 'vue';

const emit = defineEmits<{
  chooseLatest: [];
  chooseVersion: [Version];
}>();

const { modpackId, contentType, providerId, projectId } = defineProps<{
  modpackId: string;
  contentType: ContentType;
  providerId: ImplementedProvider;
  projectId: string;
  currentVersionId?: string;
}>();

const versions = tryMountInvoke(
  'contentVersions',
  modpackId,
  contentType,
  providerId,
  projectId,
);
</script>

<template>
  <button v-if="versions?.length" @click="emit('chooseLatest')">Latest</button>
  <button
    v-for="version of versions"
    @click="emit('chooseVersion', toRaw(version))"
    :class="{ current: currentVersionId === version.id }"
  >
    {{ version.name }}
  </button>
</template>

<style scoped>
.current {
  background: var(--color-ui-layer) !important;
}
</style>
