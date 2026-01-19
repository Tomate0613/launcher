<script setup lang="ts">
import { mdiChevronDown } from '@mdi/js';
import Icon from './Icon.vue';
import { onBeforeUnmount, ref } from 'vue';

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<{ disabled?: boolean }>(), {
  disabled: false,
});

const open = ref(false);

function openOptions() {
  if (props.disabled) {
    return;
  }

  cleanup();
  open.value = true;
  requestAnimationFrame(() => {
    document.addEventListener('click', closeOptions);
  });
}

function toggleOptions() {
  return open.value ? closeOptions() : openOptions();
}

function closeOptions() {
  open.value = false;
  cleanup();
}

function cleanup() {
  document.removeEventListener('click', closeOptions);
}

onBeforeUnmount(() => {
  cleanup();
});

defineExpose({
  openOptions,
  closeOptions,
});
</script>

<template>
  <div @contextmenu="openOptions">
    <button v-bind="$attrs" class="main-button" :disabled="disabled">
      <slot />
    </button>
    <button
      ref="dropdown-button"
      class="icon-btn dropdown-button"
      @click="toggleOptions"
      :disabled="disabled"
    >
      <Icon :path="mdiChevronDown" size="16" />
    </button>

    <div class="options" v-if="open">
      <slot name="options" />
    </div>
  </div>
</template>

<style scoped>
.main-button {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.dropdown-button {
  margin-left: 0.1rem;
  padding: 0.25rem;

  border-top-left-radius: 0;
  border-bottom-left-radius: 0;

  anchor-name: --split-button;
  height: 100%;
}

.options {
  position: absolute;
  position-anchor: --split-button;

  right: anchor(right);
  top: calc(anchor(bottom) + 0.25rem);

  display: flex;
  padding: 0.25rem;
  gap: 0.25rem;
  flex-direction: column;
  align-items: center;
  background-color: var(--color-background-light);
  border: 2px solid var(--color-ui-layer-dim);
  border-radius: 0.5rem;
  box-shadow: 0 2px 6px 2px var(--color-shadow-strong);
  z-index: 10;

  & *:not(svg) {
    width: 100%;
    background: transparent;
    text-align: right;
    color: unset;
    text-decoration: none;
  }

  & *:not(svg):hover,
  & *:not(svg):focus-visible {
    background-color: var(--color-ui-layer);
  }
}
</style>
