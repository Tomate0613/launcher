<script setup lang="ts">
import { usePageFocus } from '../composables/pageFocus';
import Instance from '../components/Instance.vue';
import { useAppState } from '../composables/appState';
import { useTemplateRef } from 'vue';
import { log } from '../../../common/logging/log';
import SplitButton from '../components/SplitButton.vue';
import FilePickerButton from '../components/FilePickerButton.vue';
import CreateInstancePopup from '../components/popup/CreateInstancePopup.vue';
import Icon from '../components/Icon.vue';
import { mdiDownload, mdiImport, mdiPlusBoxMultipleOutline } from '@mdi/js';
import { forEachDroppedFile, forEachInputtedFile } from '../files';

const appState = await useAppState();
const logger = log('Instances');

const createInstancePopup = useTemplateRef('create-instance-popup');
const filePicker = useTemplateRef('file-picker');
const newInstanceSplitButton = useTemplateRef('new-instance-split-button');

usePageFocus();

async function onDrop(event: DragEvent) {
  forEachDroppedFile(event, importModpack);
}

function importModpack(name: string, buffer: ArrayBuffer) {
  return window.api
    .invoke('importModpackFromFile', name, buffer)
    .catch(logger.error.bind(logger));
}

function onChooseFile() {
  forEachInputtedFile(filePicker.value?.fileInput, importModpack);
  newInstanceSplitButton.value?.closeOptions();
}
</script>

<template>
  <div class="page-header">
    <div class="action-row">
      <SplitButton
        @click="() => createInstancePopup?.openMenu()"
        ref="new-instance-split-button"
      >
        <Icon :path="mdiPlusBoxMultipleOutline" />
        New Instance

        <template v-slot:options>
          <FilePickerButton
            ref="file-picker"
            type="file"
            @change="onChooseFile"
          >
            <Icon :path="mdiImport" />
            Import from file
          </FilePickerButton>
          <RouterLink to="/install" class="fake-btn icon-btn">
            <Icon :path="mdiDownload" />
            Download
          </RouterLink>
        </template>
      </SplitButton>
    </div>
  </div>
  <div class="page-content" @dragover.prevent.stop @drop.prevent="onDrop">
    <div class="page-scrollable instances">
      <Instance
        v-for="instance of Array.from(appState.modpacks.values())
          .filter((instance) => !instance.isDeleted)
          .sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0))"
        :key="instance.id"
        :instance
        :account-id="appState.accountId"
      />
    </div>
  </div>

  <CreateInstancePopup ref="create-instance-popup" />
</template>

<style scoped>
.instances {
  padding-top: 0;
  gap: 0.5rem;

  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  grid-auto-rows: min-content;
}
</style>
