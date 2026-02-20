<script setup lang="ts">
import {
  mdiContentCopy,
  mdiOpenInApp,
  mdiViewAgendaOutline,
  mdiViewGridOutline,
} from '@mdi/js';
import ContextMenuWrapper from '../components/ContextMenuWrapper.vue';
import Icon from '../components/Icon.vue';
import { ref, useTemplateRef } from 'vue';
import Popup from '../components/Popup.vue';

const popup = useTemplateRef('popup');
const popupScreenshot = ref('');

const screenshots = await window.api.invoke('getScreenshots');

function copy(instance: string, screenshot: string) {
  window.api.invoke('copyScreenshot', instance, screenshot);
}

function showInFileManager(instance: string, screenshot: string) {
  return window.api.invoke('showScreenshotInFileManager', instance, screenshot);
}

function openScreenshotPopup(url: string) {
  popupScreenshot.value = url;
  popup.value?.openMenu();
}

const layout = ref<'list' | 'grid'>('grid');
</script>
<template>
  <div class="page-header">
    <div class="action-row">
      <button class="icon-btn" @click="layout = 'grid'">
        <Icon :path="mdiViewGridOutline" />
        Grid
      </button>
      <button class="icon-btn" @click="layout = 'list'">
        <Icon :path="mdiViewAgendaOutline" />
        List
      </button>
    </div>
  </div>
  <div class="page-content">
    <div
      class="page-scrollable screenshots"
      :class="{
        'layout-grid': layout == 'grid',
      }"
      v-if="screenshots"
    >
      <ContextMenuWrapper v-for="screenshot in screenshots">
        <template v-slot:content>
          <button
            class="btn-other"
            @click="openScreenshotPopup(screenshot.data)"
          >
            <img :src="screenshot.data" />
          </button>
        </template>
        <template v-slot:context-menu>
          <button
            class="icon-btn"
            @click="copy(screenshot.modpack, screenshot.screenshot)"
          >
            <Icon :path="mdiContentCopy" />
            Copy Image
          </button>
          <button
            class="icon-btn"
            @click="
              showInFileManager(screenshot.modpack, screenshot.screenshot)
            "
          >
            <Icon :path="mdiOpenInApp" />
            Show in File Manager
          </button>
        </template>
      </ContextMenuWrapper>
    </div>
  </div>

  <Popup ref="popup" class="screenshot-popup">
    <img :src="popupScreenshot" />
  </Popup>
</template>

<style scoped>
img {
  width: 100%;
}

.screenshots {
  padding-top: 0;
}

.layout-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(256px, 1fr));
  grid-auto-rows: min-content;

  & button {
    all: unset;

    cursor: pointer;
    padding: 0;
    height: 100%;
    display: flex;
    align-items: center;
    background: var(--color-ui-layer-dim);
    user-select: none;

    & img {
      display: block;
    }
  }
}

.screenshot-popup {
  & img {
    max-height: 90vh;
  }
}
</style>
