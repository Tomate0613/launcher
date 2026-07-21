<script setup lang="ts">
import { useTemplateRef } from 'vue';
import type { ModpackFrontendData } from '../../../main/data/modpack';
import Popup from './Popup.vue';
import Card from './Card.vue';
import ChooseIconPopup from './popup/ChooseIconPopup.vue';
import {
  mdiCogOutline,
  mdiDeleteOutline,
  mdiFolderOpenOutline,
  mdiLightbulbOnOutline,
  mdiPackageVariantClosed,
  mdiPaletteSwatchOutline,
} from '@mdi/js';
import { useCommandPalette } from '../composables/commandPalette';
import { useContextMenu } from '../composables/contextMenu';

const { instance, accountId } = defineProps<{
  instance: ModpackFrontendData;
  accountId?: string;
}>();

const commandPalette = useCommandPalette();
const contextMenu = useContextMenu();

async function launch() {
  if (!accountId) {
    return;
  }

  await window.api.invoke('launchModpack', instance.id, accountId);
}

function openFolder() {
  return window.api.invoke('openModpackFolder', instance.id);
}

function deleteInstance() {
  return window.api.invoke('deleteModpack', instance.id);
}

function openModpackOptions() {
  commandPalette.value?.openModpackOptions(instance.id);
}

const confirmInstanceDelete = useTemplateRef('confirm-instance-delete');
const iconChooser = useTemplateRef('icon-chooser');

function openContextMenu(event: MouseEvent) {
  contextMenu.value?.openContextMenu(
    (
      [
        instance.loader.id !== 'vanilla' && {
          name: 'Mods',
          icon: mdiPackageVariantClosed,
          href: `/${instance.id}/mods`,
        },
        {
          name: 'Shaderpacks',
          icon: mdiLightbulbOnOutline,
          href: `/${instance.id}/shaderpacks`,
        },
        {
          name: 'Resourcepacks',
          icon: mdiPaletteSwatchOutline,
          href: `/${instance.id}/resourcepacks`,
        },
        {
          name: 'Open Folder',
          icon: mdiFolderOpenOutline,
          execute() {
            openFolder();
          },
        },
        {
          name: 'Settings',
          icon: mdiCogOutline,
          href: `/${instance.id}/settings`,
        },
        { type: 'hr' },
        {
          name: 'Delete',
          icon: mdiDeleteOutline,
          execute() {
            confirmInstanceDelete.value?.openMenu();
          },
        },
      ] as const
    ).filter((n) => n !== false),
    event,
  );
}
</script>

<template>
  <Card
    :icon="instance.icon"
    :name="instance.name"
    :progress="
      instance.processes.length > 0 &&
      instance.processes.reduce(
        (acc, val) => (acc < val.progress ? acc : val.progress),
        1,
      )
    "
    :primary-action-disabled="
      !accountId || instance.processes.some((process) => process.blocking)
    "
    :open-icon-chooser="iconChooser?.openMenu"
    :open-context-menu="openContextMenu"
    @click-primary-action="launch"
    @keydown.enter.stop="openModpackOptions()"
  >
    <template v-slot:description>
      {{ instance.gameVersion }} - {{ instance.loader.id }}
    </template>
  </Card>

  <Popup ref="confirm-instance-delete">
    <h2>Delete Instance</h2>

    Do you really want to delete "{{ instance.name }}"

    <hr />
    <div class="action-row">
      <button @click="deleteInstance">Yes</button>
      <button @click="confirmInstanceDelete?.closeMenu">No</button>
    </div>
  </Popup>

  <ChooseIconPopup ref="icon-chooser" :instance="instance" />
</template>
