<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import Popup from '../Popup.vue';
import type { InstanceSyncOptions } from '../../../../main/data/sync';

const popup = useTemplateRef('popup');

const { options } = defineProps<{
  options: InstanceSyncOptions | undefined;
}>();

const type = ref(options?.type ?? "disabled");

watch(() => options, () => {
  type.value = options?.type ?? "disabled";
});

watch(type, () => {

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
