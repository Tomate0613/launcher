<script setup lang="ts">
import { useTemplateRef } from 'vue';
import ContextMenu from './ContextMenu.vue';

const contextMenu = useTemplateRef('context-menu');
</script>

<template>
  <div @contextmenu.prevent="contextMenu?.openMenu">
    <slot name="content" />
  </div>
  <ContextMenu ref="context-menu">
    <slot name="context-menu" />
  </ContextMenu>
</template>
