<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import Popup from '../Popup.vue';
import { unique } from '../../../../common/utils';
import { useCommandPalette } from '../../composables/commandPalette';

const popup = useTemplateRef('popup');

const modpackId = ref<string>();
const defaults = ref<string[]>([]);
const suggestions = ['options.txt', 'config'];

onMounted(async () => {
  defaults.value = await window.api.invoke('getDefaultFiles');
});

const commandPalette = useCommandPalette();

const keys = computed(() => suggestions.concat(defaults.value).filter(unique));

async function apply(file: string) {
  if (!modpackId.value) {
    return;
  }

  await window.api.invoke('applyDefaultFile', modpackId.value, file);
  defaults.value = await window.api.invoke('getDefaultFiles');
}

async function clear(file: string) {
  await window.api.invoke('clearDefaultFile', file);
  defaults.value = await window.api.invoke('getDefaultFiles');
}

function selectModpack() {
  commandPalette.value?.selectModpack(
    (modpack) => (modpackId.value = modpack.id),
  );
}

function openMenu() {
  popup.value?.openMenu();
}

function closeMenu() {
  popup.value?.closeMenu();
}

defineExpose({
  openMenu,
  closeMenu,
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

    <div class="files" v-if="modpackId">
      <label v-for="key in keys">
        {{ key }}
        <button v-if="!defaults.includes(key)" @click="apply(key)">
          Apply
        </button>
        <button v-else @click="clear(key)">Clear</button>
      </label>
    </div>
    <div class="select">
      Select instance to copy from
      <button @click="selectModpack">Select</button>
    </div>

    <hr />
    <button>Done</button>
  </Popup>
</template>

<style scoped>
.description {
  align-self: self-start;
  color: var(--color-text-secondary);

  padding-bottom: 2rem;
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

  padding-bottom: 2rem;
}

.select {
  display: flex;
  justify-content: space-between;
}
</style>
