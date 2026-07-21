<script setup lang="ts">
import { mdiDotsHorizontal, mdiPlay } from '@mdi/js';
import ImageIcon from './ImageIcon.vue';
import Icon from './Icon.vue';

const props = defineProps<{
  icon?: string;
  defaultIcon?: string;
  name: string;
  progress?: number | false;
  primaryActionDisabled?: boolean;
  primaryActionIcon?: string;
  openIconChooser?: () => void;
  openContextMenu?: (event: MouseEvent) => void;
}>();

const emit = defineEmits<{
  clickPrimaryAction: [PointerEvent];
}>();

function showContextMenu(event: MouseEvent) {
  if (!props.openContextMenu) {
    return;
  }

  props.openContextMenu(event);
}
</script>

<template>
  <div
    class="card"
    @contextmenu="showContextMenu"
    tabindex="0"
    v-bind="$attrs"
  >
    <ImageIcon
      class="card-icon"
      :class="{ 'card-icon-btn': !!openIconChooser }"
      :src="icon"
      :fallback="defaultIcon"
      @click="openIconChooser"
    />
    <div class="info">
      <div class="first-line ellipsis">
        <div class="ellipsis">
          {{ name }}
        </div>
        <slot name="top-right" />
      </div>

      <slot />

      <div class="description">
        <slot name="description" />
      </div>

      <button
        class="primary-action"
        tabindex="-1"
        :disabled="primaryActionDisabled"
        @click="(event) => emit('clickPrimaryAction', event)"
      >
        <Icon :path="primaryActionIcon ?? mdiPlay" />
      </button>
      <button
        tabindex="-1"
        class="context-menu-button"
        @click.stop="showContextMenu"
        v-if="openContextMenu"
      >
        <Icon :path="mdiDotsHorizontal" />
      </button>
    </div>

    <progress
      class="card-progress"
      :value="progress"
      v-if="progress !== false && progress !== undefined"
    />
  </div>
</template>

<style scoped>
.card {
  padding: 0.5rem;
  background-color: var(--color-ui-layer-dim);
  border-radius: var(--border-radius-strong);
  display: flex;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;

  /* transition: outline-offset 200ms; */
  /* outline-offset: 4px; */

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 0;
  }

  & .card-icon {
    width: 4rem;
    height: 4rem;

    border-radius: var(--border-radius);
    box-shadow: 0 2px 8px var(--color-shadow-strong);
    object-fit: cover;

    &.card-icon-btn {
      cursor: pointer;
    }
  }

  & .info {
    flex-grow: 1;

    & .first-line {
      display: flex;
      justify-content: space-between;
    }

    & .description {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
    }

    & .primary-action,
    & .context-menu-button {
      position: absolute;
      bottom: 0.5rem;
      right: 0.5rem;

      width: 2rem;
      height: 2rem;
      padding: 0.25rem;
      border-radius: var(--border-radius-strong);
    }

    & .context-menu-button {
      background: none;
      box-shadow: none;
      right: 2.75rem;
    }
  }
}
</style>
