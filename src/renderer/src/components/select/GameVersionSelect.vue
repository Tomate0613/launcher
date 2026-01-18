<script lang="ts" setup>
import { computedAsync } from '@vueuse/core';
import { LoaderId } from 'tomate-loaders';
import { computed, ref } from 'vue';

const props = defineProps<{ loader: LoaderId }>();
const model = defineModel<string>();

const versions = computedAsync(
  async () => await window.api.invoke('gameVersions', props.loader),
  [],
);
const showSnapshots = ref(false);

const displayedVersions = computed(() =>
  showSnapshots.value
    ? versions.value
    : versions.value.filter((version) => version.stable),
);
</script>

<template>
  <select v-model="model">
    <option
      v-for="version of displayedVersions"
      :key="version.version"
      :value="version.version"
    >
      {{ version.version }}
    </option>
  </select>

  <label>
    <input type="checkbox" v-model="showSnapshots" />
    Show Snapshots
  </label>
</template>
