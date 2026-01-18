<script setup lang="ts">
import { mdiDotsHorizontal, mdiPlay } from '@mdi/js';
import ContextMenu from './ContextMenu.vue';
import ImageIcon from './ImageIcon.vue';
import Icon from './Icon.vue';
import { useSlots, useTemplateRef } from 'vue';

defineProps<{
  icon?: string;
  defaultIcon?: string;
  name: string;
  progress?: number | false;
  primaryActionDisabled?: boolean;
  primaryActionIcon?: string;
  openIconChooser?: () => void;
}>();

const emit = defineEmits<{ clickPrimaryAction: [PointerEvent] }>();

const contextMenu = useTemplateRef('context-menu');

function showContextMenu(event: MouseEvent) {
  contextMenu.value?.openMenu(event);
}

const slots = useSlots();
</script>

<template>
  <div class="card" @contextmenu.prevent="showContextMenu">
    <ImageIcon
      class="card-icon"
      :class="{ 'card-icon-btn': !!openIconChooser }"
      :src="icon"
      :fallback="defaultIcon"
      @click="openIconChooser"
    />
    <div class="info">
      <div class="ellipsis">
        {{ name }}
      </div>

      <slot />

      <div class="description">
        <slot name="description" />
      </div>

      <button
        class="primary-action"
        :disabled="primaryActionDisabled"
        @click="(event) => emit('clickPrimaryAction', event)"
      >
        <Icon :path="primaryActionIcon ?? mdiPlay" />
      </button>
      <button
        class="context-menu-button"
        @click.stop="showContextMenu"
        v-if="slots.contextmenu"
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

  <ContextMenu ref="context-menu" v-if="slots.contextmenu">
    <slot name="contextmenu" />
  </ContextMenu>
</template>

<style scoped>
.card {
  padding: 0.5rem;
  background-color: var(--color-ui-layer-dim);
  border-radius: 0.5rem;
  display: flex;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;

  & .card-icon {
    width: 4rem;
    height: 4rem;

    border-radius: 0.25rem;
    box-shadow: 0 2px 8px var(--color-shadow-strong);
    object-fit: cover;

    &.card-icon-btn {
      cursor: pointer;
    }
  }

  .description {
    font-size: 0.75rem;
    opacity: 0.75;
  }

  .primary-action,
  .context-menu-button {
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;

    width: 2rem;
    height: 2rem;
    padding: 0.25rem;
    border-radius: 0.5rem;
  }

  .context-menu-button {
    background: none;
    box-shadow: none;
    right: 2.75rem;
  }
}
</style>
