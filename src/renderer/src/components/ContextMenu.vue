<template>
  <div
    v-if="isOpen"
    ref="menu"
    class="context-menu"
    :style="{ top: `${y}px`, left: `${x}px` }"
    @click.self.stop
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onUnmounted, ref, useTemplateRef } from 'vue';

const menu = useTemplateRef('menu');
const x = ref(0);
const y = ref(0);
const isOpen = ref(false);

function openMenu(event: MouseEvent) {
  event.preventDefault();

  openAt(event.clientX, event.clientY);
}

function openAt(posX: number, posY: number) {
  x.value = posX;
  y.value = posY;

  if (isOpen.value) {
    closeMenu();
  }

  isOpen.value = true;

  nextTick(adjustPosition);

  window.dispatchEvent(new Event('context-menu-opened'));
  window.addEventListener('context-menu-opened', closeMenu);

  window.addEventListener('click', closeMenu);
}

function adjustPosition() {
  if (!menu.value) return;

  const { innerWidth, innerHeight } = window;
  const { offsetWidth, offsetHeight } = menu.value;

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

function cleanup() {
  document.removeEventListener('click', closeMenu);
  window.removeEventListener('context-menu-opened', closeMenu);
}

onUnmounted(() => {
  cleanup();
});

defineExpose({ openMenu, openAt, closeMenu });
</script>

<style>
.context-menu {
  display: flex;
  position: fixed;
  min-width: 120px;
  gap: 0.25rem;
  padding: 0.25rem;
  flex-direction: column;
  background-color: var(--color-context-menu);
  border: 2px solid var(--color-ui-layer-dim);
  border-radius: 0.5rem;
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
.context-menu button {
  &:hover,
  &:focus-visible {
    background-color: var(--color-ui-layer);
  }
}
</style>
