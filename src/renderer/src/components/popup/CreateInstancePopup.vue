<script setup lang="ts">
import { LoaderId } from 'tomate-loaders';
import Popup from '../Popup.vue';
import GameVersionSelect from '../select/GameVersionSelect.vue';
import LoaderSelect from '../select/LoaderSelect.vue';

import { ref, useTemplateRef } from 'vue';

const popup = useTemplateRef('popup');

const instanceName = ref('');
const instanceLoader = ref<LoaderId>('fabric');
const instanceGameVersion = ref<string | undefined>(undefined);

async function createInstance() {
  if (!instanceGameVersion.value) {
    return;
  }

  await window.api.invoke(
    'createModpack',
    instanceName.value,
    instanceGameVersion.value,
    {
      id: instanceLoader.value,
    },
  );

  popup.value?.closeMenu();
}

function openMenu() {
  popup.value?.openMenu();
}

function closeMenu() {
  popup.value?.closeMenu();
}

defineExpose({
  openMenu,
  closeMenu
});

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <Popup ref="popup">
    <h2>Create Instance</h2>

    <div class="settings">
      <label class="popup-option">
        Name
        <input type="text" v-model="instanceName" />
      </label>
      <label class="popup-option">
        Loader
        <LoaderSelect v-model="instanceLoader" />
      </label>
      <label class="popup-option multi-line">
        Game Version
        <GameVersionSelect
          :loader="instanceLoader"
          v-model="instanceGameVersion"
        />
      </label>
    </div>

    <hr />

    <button
      @click="createInstance"
      :disabled="!instanceName || !instanceLoader || !instanceGameVersion"
    >
      Create
    </button>
  </Popup>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

label.popup-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-grow: 1;
  justify-content: right;

  & input,
  & :global(select) {
    /* TODO: Figure this out; I want to select stuff in the child component, but :global makes the entire selector global */
    width: 20rem;
  }
}

label.popup-option.multi-line {
  flex-direction: column;
  align-items: start;

  & select:global(select) {
    display: flex;
    width: 100%;
  }
}
</style>
