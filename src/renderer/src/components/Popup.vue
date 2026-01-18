<script lang="ts" setup>
import { ref, useTemplateRef } from 'vue';

const dialog = useTemplateRef('dialog');
const isOpen = ref(false);

function openMenu() {
  dialog.value?.showModal();
  isOpen.value = true;
}

function closeMenu() {
  dialog.value?.close();
  isOpen.value = false;
}

defineExpose({ openMenu, closeMenu, isOpen });
</script>

<template>
  <dialog ref="dialog" @close="isOpen = false">
    <button class="close-button" @click="closeMenu">&times;</button>
    <slot v-if="isOpen" />
  </dialog>
</template>

<style scoped>
dialog {
  outline: none;
  border: 1px solid var(--color-ui-layer);
  border-radius: 0.5rem;
  position: relative;

  & .close-button {
    position: absolute;
    right: 0.25rem;
    top: 0.25rem;
    margin: 0.25rem;

    width: 1.5rem;
    height: 1.5rem;

    border-radius: 100%;
  }

  & :global(h2) {
    text-align: center;

    /* Make sure the close button doesn't overlap */
    padding-left: 2rem;
    padding-right: 2rem;
  }

  &::backdrop {
    background: #050505aa;
  }

  & :global(hr) {
    padding-top: 0.5rem;
    border: none;
    border-bottom: 1px solid var(--color-ui-layer);
  }

  & :global(.action-row) {
    justify-content: space-between;
  }

  & :global(.settings) {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
</style>
