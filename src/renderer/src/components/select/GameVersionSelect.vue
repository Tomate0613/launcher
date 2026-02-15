<script lang="ts" setup>
import { computedAsync } from '@vueuse/core';
import { LoaderId } from 'tomate-loaders';
import { computed, ref } from 'vue';
import { log } from '../../../../common/logging/log';

const logger = log('game-version-select');

const props = defineProps<{ loader: LoaderId }>();
const model = defineModel<string>();

const versions = computedAsync(
  async () => {
    const loaders = await window.api.invoke('gameVersions', props.loader);

    if (model.value) {
      const loader = loaders.find((l) => l.version == model.value);

      if (!loader) {
        logger.warn(`Game version "${model.value}" not included in list`);
      }

      showSnapshots.value = loader ? !loader.stable : false;
    }

    return loaders;
  },
  model.value ? [{ version: model.value, stable: true }] : [],
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
