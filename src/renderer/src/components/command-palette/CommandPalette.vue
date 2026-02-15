<script setup lang="ts">
import { useMagicKeys, whenever } from '@vueuse/core';
import CommandPaletteContent from './CommandPaletteContent.vue';
import { ref, useTemplateRef } from 'vue';

const commandPalette = useTemplateRef('dialog');

const keys = useMagicKeys();

const open = ref(false);

whenever(keys['Ctrl+K'], () => {
  show();
});

function show() {
  commandPalette.value?.showModal();
  open.value = true;
}

// onMounted(() => {
//   if (!commandPalette.value?.open) show();
// });
</script>

<template>
  <dialog ref="dialog" @close="open = false">
    <CommandPaletteContent v-if="open" :closeCommandPalette="() => commandPalette?.close()"/>
  </dialog>
</template>

<style scoped>
dialog {
  min-width: 50vw;
  outline: none;
  border: 1px solid var(--color-ui-layer);
  border-radius: 0.5rem;
  position: relative;

  padding: 0;
}
</style>
