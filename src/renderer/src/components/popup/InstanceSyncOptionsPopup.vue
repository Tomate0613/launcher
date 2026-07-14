<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue';
import Popup from '../Popup.vue';
import type { InstanceSyncOptions } from '../../../../main/data/sync/types';
import '../../assets/settings.css';

const popup = useTemplateRef('popup');

const options = defineModel<InstanceSyncOptions | undefined>();

const type = ref<InstanceSyncOptions['type'] | 'disabled'>(
  options.value?.type ?? 'disabled',
);

watch(
  () => options,
  () => {
    type.value = options.value?.type ?? 'disabled';
  },
);

watch(type, () => {
  if (type.value === 'disabled') {
    options.value = undefined;
    return;
  }

  options.value = {
    ...options.value,
    type: type.value,
  };
});

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
    <section class="settings-section">
      <h2>Sync Options</h2>

      <label class="settings-option">
        Type
        <select v-model="type">
          <option value="disabled">Disabled</option>
          <option value="external">External</option>
          <option value="unsup">Unsup</option>
        </select>
      </label>

      <label v-if="type === 'external'" class="settings-option settings-option-text">
        <div>
          Command
        </div>
        <input type="text" v-model="options.command"></input>
      </label>
    </section>
  </Popup>
</template>
