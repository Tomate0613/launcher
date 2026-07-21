import { ref } from 'vue';
import type { ContextMenuItem } from '../components/context-menu/ContextMenu.vue';

type ContextMenu = {
  openContextMenu(menuItems: ContextMenuItem[], event: MouseEvent): void;
};
const contextMenuRef = ref<ContextMenu | null>(null);

export function setContextMenuInstance(instance: ContextMenu) {
  contextMenuRef.value = instance;
}

export function useContextMenu() {
  return contextMenuRef;
}
