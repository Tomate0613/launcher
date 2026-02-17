<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import Popup from '../Popup.vue';
import { unique } from '../../../../common/utils';

const popup = useTemplateRef('popup');

const { modpackId } = defineProps<{ modpackId: string }>();

const defaults = ref(await window.api.invoke('getDefaultFiles'));
const suggestions = ['options.txt', 'config'];

const keys = computed(() => defaults.value.concat(suggestions).filter(unique));

async function apply(file: string) {
  await window.api.invoke('applyDefaultFile', modpackId, file);
  defaults.value = await window.api.invoke('getDefaultFiles');
}

async function clear(file: string) {
  await window.api.invoke('clearDefaultFile', file);
  defaults.value = await window.api.invoke('getDefaultFiles');
}

onMounted(() => {
  popup.value?.openMenu();
});
</script>

<template>
  <Popup ref="popup">
    <h2>Set Minecraft Defaults</h2>
    <div class="description">
      Defaults will automatically be copied into new instances <br />
      This allows you to for example set a different default fov
      <br />
      <br />
      Choose which files/directories to use as defaults
    </div>

    <hr />
    <div class="files">
      <label v-for="key in keys">
        {{ key }}
        <button v-if="!defaults.includes(key)" @click="apply(key)">
          Apply
        </button>
        <button v-else @click="clear(key)">Clear</button>
      </label>
    </div>

    <hr />
    <button>Done</button>
  </Popup>
</template>

<style scoped>
.description {
  align-self: self-start;
  color: var(--color-text-secondary);
}

.files {
  display: flex;
  gap: 0.25rem;
  flex-direction: column;

  & label {
    display: flex;
    justify-content: space-between;

    & button {
      width: 4rem;
    }
  }
}
</style>
