<script setup lang="ts">
import { mdiArrowUpBoldOutline, mdiChevronUp } from '@mdi/js';
import Icon from './Icon.vue';

defineProps<{ keybind: string }>();

const isMac = window.api.platform === 'darwin';
const isLinux = window.api.platform === 'linux';
</script>

<template>
  <code v-if="keybind == 'Ctrl'">
    <template v-if="isMac">⌘</template>
    <Icon v-else-if="isLinux" :path="mdiChevronUp" :size="16" />
    <template v-else>Ctrl</template>
  </code>
  <code v-else-if="keybind == 'Return'"> ↵ </code>
  <code v-else-if="keybind == 'Shift'">
    <Icon :path="mdiArrowUpBoldOutline" :size="16" />
  </code>
  <code v-else-if="keybind == 'Alt'">
    {{ isMac ? '⌥' : 'Alt'}}
  </code>
  <code v-else>
    {{ keybind }}
  </code>
</template>

<style scoped>
code {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.75rem;
  height: 1.75rem;
  font-size: 0.85rem;
  line-height: 1;
  border: 1px solid var(--color-ui-layer);
  padding: 0 0.25rem;
  height: 1.5rem;
  border-radius: var(--border-radius);
}
</style>
