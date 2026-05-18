<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue';
import Popup from '../Popup.vue';
import type { InstanceSyncOptions } from '../../../../main/data/sync';

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
    <h2>Sync Options</h2>

    <select v-model="type">
      <option value="disabled">Disabled</option>
      <option value="external">External</option>
    </select>
  </Popup>
</template>
