<script setup lang="ts">
const model = defineModel();
defineProps<{ name?: string; disabled?: boolean }>();
</script>

<template>
  <div class="toggle" :class="{ 'toggle-disabled': disabled }">
    <input type="checkbox" :name v-model="model" :disabled="disabled" />
  </div>
</template>

<style>
.toggle {
  position: relative;
  width: 2.5rem;
  height: 1.5rem;
  background-color: var(--color-ui-layer);
  border-radius: 0.75rem;
  transition: 200ms;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    width: 1rem;
    height: 1rem;
    margin: 0.25rem;
    background-color: white;
    border-radius: 1rem;
    transition: 200ms;
    pointer-events: none;
  }

  input {
    appearance: none;
    margin: 0;
    width: inherit;
    height: inherit;
    border-radius: inherit;
    cursor: pointer;

    &:focus-visible {
      outline-offset: 3px;
    }
  }

  &.toggle-disabled input {
    cursor: not-allowed;
  }

  &:has(:checked) {
    background-color: var(--color-accent);
  }

  &:not(.toggle-disabled):has(:active)::before {
    width: 2rem;
  }

  &:has(:checked) {
    &:not(.toggle-disabled) {
      &:has(:not(:active))::before {
        left: 1rem;
      }
    }

    &.toggle-disabled::before {
      left: 1rem;
    }
  }
}
</style>
