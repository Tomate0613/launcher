<script setup lang="ts">
import { useTemplateRef } from 'vue';
import type { ModpackFrontendData } from '../../../main/data/modpack';
import ContextMenu from './ContextMenu.vue';
import Popup from './Popup.vue';
import Card from './Card.vue';
import ChooseIconPopup from './popup/ChooseIconPopup.vue';
import Icon from './Icon.vue';
import {
  mdiCogOutline,
  mdiFolderOpenOutline,
  mdiLightbulbOnOutline,
  mdiPackageVariantClosed,
  mdiPaletteSwatchOutline,
  mdiTrashCanOutline,
} from '@mdi/js';

const { instance, accountId } = defineProps<{
  instance: ModpackFrontendData;
  accountId?: string;
}>();

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

const confirmInstanceDelete = useTemplateRef('confirm-instance-delete');
const iconChooser = useTemplateRef('icon-chooser');
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
    @click-primary-action="launch"
  >
    <template v-slot:description>
      {{ instance.gameVersion }} - {{ instance.loader.id }}
    </template>

    <template v-slot:contextmenu>
      <RouterLink :to="`/${instance.id}/mods`" draggable="false" v-if="instance.loader.id !== 'vanilla'">
        <button class="icon-btn">
          <Icon :path="mdiPackageVariantClosed" />
          Mods
        </button>
      </RouterLink>
      <RouterLink :to="`/${instance.id}/shaderpacks`" draggable="false">
        <button class="icon-btn">
          <Icon :path="mdiLightbulbOnOutline" />
          Shaderpacks
        </button>
      </RouterLink>
      <RouterLink :to="`/${instance.id}/resourcepacks`" draggable="false">
        <button class="icon-btn">
          <Icon :path="mdiPaletteSwatchOutline" />
          Resourcepacks
        </button>
      </RouterLink>
      <button class="icon-btn" @click="openFolder">
        <Icon :path="mdiFolderOpenOutline" />
        Open Folder
      </button>

      <RouterLink :to="`/${instance.id}/settings`" draggable="false">
        <button class="icon-btn">
          <Icon :path="mdiCogOutline" />
          Settings
        </button>
      </RouterLink>
      <hr />
      <button @click="confirmInstanceDelete?.openMenu" class="icon-btn">
        <Icon :path="mdiTrashCanOutline" />
        Delete
      </button>
    </template>
  </Card>

  <ContextMenu ref="contextMenu"> </ContextMenu>

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
