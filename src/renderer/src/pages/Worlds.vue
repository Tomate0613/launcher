<script setup lang="ts">
import { mdiFolderOpenOutline } from '@mdi/js';
import Card from '../components/Card.vue';
import { useAppState } from '../composables/appState';
import CardGridPage from '../components/CardGridPage.vue';
import { useContextMenu } from '../composables/contextMenu';

const contextMenu = useContextMenu();
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

function getModpack(modpack: string) {
  return modpacks.get(modpack);
}

function openFolder(modpack: string, world: string) {
  window.api.invoke('openWorldFolder', modpack, world);
}

function launch(modpack: string, save: string) {
  if (!accountId) {
    return;
  }

  window.api.invoke('launchModpack', modpack, accountId, {
    type: 'singleplayer',
    identifier: save,
  });
}
</script>
<template>
  <div class="page-header" />
  <div class="page-content">
    <CardGridPage class="worlds">
      <Card
        v-for="world in worlds"
        :icon="world.icon"
        :name="world.name"
        :primary-action-disabled="!accountId"
        :open-context-menu="
          (event) =>
            contextMenu?.openContextMenu(
              [
                {
                  name: 'Open Folder',
                  icon: mdiFolderOpenOutline,
                  execute() {
                    openFolder(world.modpack, world.save);
                  },
                },
              ],
              event,
            )
        "
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
      </Card>
    </CardGridPage>
  </div>
</template>
