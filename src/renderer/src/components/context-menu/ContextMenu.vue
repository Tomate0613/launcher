<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import { setContextMenuInstance } from '../../composables/contextMenu';
import Icon from '../Icon.vue';
import { useEventListener } from '@vueuse/core';
const contextMenu = useTemplateRef('context-menu');

const items = ref<ContextMenuItem[]>([]);

const x = ref(0);
const y = ref(0);

const isOpen = ref(false);

type HrItem = { type: 'hr' };

type ButtonItem = {
  name: string;
  icon: string;
} & (
  | { href: string }
  | {
      execute: () => void;
    }
);

export type ContextMenuItem = HrItem | ButtonItem;

function openAt(posX: number, posY: number) {
  x.value = posX;
  y.value = posY;

  if (isOpen.value) {
    closeMenu();
  }

  isOpen.value = true;

  nextTick(() => {
    adjustPosition();
    contextMenu.value?.focus();
  });

  window.dispatchEvent(new Event('context-menu-opened'));
  window.addEventListener('context-menu-opened', closeMenu);

  window.addEventListener('click', closeMenu);
  window.addEventListener('scroll', closeMenu, { capture: true });
}

function adjustPosition() {
  if (!contextMenu.value) return;

  const { innerWidth, innerHeight } = window;
  const { offsetWidth, offsetHeight } = contextMenu.value;

  if (x.value + offsetWidth > innerWidth) {
    x.value = innerWidth - offsetWidth;
  }
  if (y.value + offsetHeight > innerHeight) {
    y.value = innerHeight - offsetHeight;
  }
}

function closeMenu() {
  isOpen.value = false;
  cleanup();
}

useEventListener('keydown', (ev: KeyboardEvent) => {
  if (ev.key === 'Escape') {
    closeMenu();
  }
});

function cleanup() {
  document.removeEventListener('click', closeMenu);
  document.removeEventListener('scroll', closeMenu);

  window.removeEventListener('context-menu-opened', closeMenu);
}

function openContextMenu(menuItems: ContextMenuItem[], event: MouseEvent) {
  event.preventDefault();

  items.value = menuItems;
  openAt(event.clientX, event.clientY);
}

onMounted(() => {
  setContextMenuInstance({ openContextMenu });
});

onUnmounted(() => {
  cleanup();
});
</script>

<template>
  <div
    class="context-menu"
    ref="context-menu"
    v-if="isOpen"
    :style="{ top: `${y}px`, left: `${x}px` }"
  >
    <template v-for="item in items">
      <RouterLink
        v-if="'href' in item"
        :to="item.href"
        draggable="false"
        class="fake-btn icon-btn"
      >
        <Icon :path="item.icon" />
        {{ item.name }}
      </RouterLink>

      <button
        v-else-if="'execute' in item"
        @click="item.execute()"
        class="icon-btn"
      >
        <Icon :path="item.icon" />
        {{ item.name }}
      </button>

      <hr v-else-if="'type' in item && item.type === 'hr'" />
    </template>
  </div>
</template>

<style scoped>
.context-menu {
  display: flex;
  position: fixed;
  min-width: 120px;
  gap: 0.25rem;
  padding: 0.25rem;
  flex-direction: column;
  background-color: var(--color-context-menu);
  border: 2px solid var(--color-ui-layer-dim);
  border-radius: var(--border-radius-strong);
  box-shadow: 0 2px 6px 2px var(--color-shadow-strong);
  z-index: 10;

  & hr {
    width: calc(100% + 0.5rem);
    margin: 0;
    border: none;
    border-bottom: 2px solid var(--color-ui-layer-dim);
  }
}

.context-menu::backdrop {
  background: transparent;
}

.context-menu button,
.context-menu a {
  display: block;
  width: 100%;
  background-color: transparent;
  text-align: left;
  color: unset;
  text-decoration: none;

  &.icon-btn {
    display: inline-flex;

    & svg {
      height: 1rem;
      width: 1rem;
    }
  }
}
.context-menu button,
.context-menu .fake-btn {
  &:hover,
  &:focus-visible {
    background-color: var(--color-ui-layer);
  }
}
</style>
