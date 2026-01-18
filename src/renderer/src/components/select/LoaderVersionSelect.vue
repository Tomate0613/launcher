<script setup lang="ts">
import { computedAsync } from '@vueuse/core';
import { LoaderId } from 'tomate-loaders';
import { watch } from 'vue';

const { loader, gameVersion } = defineProps<{
  loader: LoaderId;
  gameVersion: string;
}>();

const value = defineModel<string | undefined>();

watch(value, () => {
  if (value.value === 'undefined') {
    value.value = undefined;
  }
});

const versions = computedAsync(
  async () => await window.api.invoke('loaderVersions', loader, gameVersion),
);
</script>

<template>
  <select v-model="value" placeholder="Latest">
    <option value="undefined" default>Latest</option>
    <option v-for="version in versions" :value="version">{{ version }}</option>
  </select>
</template>
