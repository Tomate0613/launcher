<script setup lang="ts">
import { useTemplateRef } from 'vue';

const dialog = useTemplateRef('dialog');

function toggleDialog() {
  if (!dialog.value) {
    return;
  }

  dialog.value.open = !dialog.value.open;
}
</script>

<template>
  <button class="icon-btn installed-filter-button" @click="toggleDialog">
    <slot />
  </button>
  <dialog class="installed-filter-dialog" ref="dialog">
    <slot name="dialog" />
  </dialog>
</template>

<style scoped>
.installed-filter-button {
  anchor-name: --installed-filter-button;
}

.installed-filter-dialog:open {
  display: flex;
}

.installed-filter-dialog {
  position: absolute;
  position-anchor: --installed-filter-button;

  left: anchor(left);
  top: calc(anchor(bottom) + 0.25rem);

  background: var(--color-background);
  z-index: 100;

  margin: 0;
  border: 1px solid var(--color-ui-layer);
  border-radius: 0.5rem;

  flex-direction: column;
  gap: 0.5rem;
}
</style>
