<script setup lang="ts">
import {
  mdiContentCopy,
  mdiOpenInApp,
  mdiViewAgendaOutline,
  mdiViewGridOutline,
} from '@mdi/js';
import ContextMenuWrapper from '../components/ContextMenuWrapper.vue';
import Icon from '../components/Icon.vue';
import { ref } from 'vue';

const screenshots = await window.api.invoke('getScreenshots');

function copy(instance: string, screenshot: string) {
  window.api.invoke('copyScreenshot', instance, screenshot);
}

function showInFileManager(instance: string, screenshot: string) {
  return window.api.invoke('showScreenshotInFileManager', instance, screenshot);
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
          <div>
            <img :src="screenshot.data" />
          </div>
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

  & div {
    height: 100%;
    display: flex;
    align-items: center;
    background: var(--color-ui-layer-dim);

    & img {
      display: block;
    }
  }
}
</style>
