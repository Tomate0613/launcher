<script setup lang="ts">
import { mdiFolderOpenOutline } from '@mdi/js';
import Card from '../components/Card.vue';
import { useAppState } from '../composables/appState';
import Icon from '../components/Icon.vue';

const worlds = await window.api.invoke('getWorlds');

const { modpacks, accountId } = await useAppState();

function gameTypeName(type: number) {
  switch (type) {
    case 0:
      return 'Survival';
    case 1:
      return 'Creative';
    case 2:
      return 'Adventure';
  }

  return 'Unknown';
}

function modpackId(folder: string) {
  return folder.split('-').slice(-5).join('-');
}

function getModpack(folder: string) {
  return modpacks.get(modpackId(folder));
}

function openFolder(modpack: string, world: string) {
  window.api.invoke('openWorldFolder', modpack, world);
}

function launch(folder: string, save: string) {
  if (!accountId) {
    return;
  }

  window.api.invoke('launchModpack', modpackId(folder), accountId, save);
}
</script>
<template>
  <div class="page-header" />
  <div class="page-content">
    <div class="page-scrollable worlds">
      <Card
        v-for="world in worlds"
        :icon="world.icon"
        :name="world.name"
        :primary-action-disabled="!accountId"
        @click-primary-action="launch(world.modpack, world.save)"
      >
        <template v-slot:description>
          <div class="modpack">
            {{ getModpack(world.modpack)?.name }}
          </div>
          <div class="gamemode">
            {{ gameTypeName(world.gameType) }}
          </div>
        </template>

        <template v-slot:contextmenu>
          <button
            class="icon-btn"
            @click="openFolder(world.modpack, world.save)"
          >
            <Icon :path="mdiFolderOpenOutline" />
            Open Folder
          </button>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.worlds {
  padding-top: 0;
  gap: 0.5rem;

  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  grid-auto-rows: min-content;
}
</style>
