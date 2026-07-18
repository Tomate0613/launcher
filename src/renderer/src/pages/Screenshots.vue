<script setup lang="ts">
import {
  mdiArrowLeft,
  mdiArrowRight,
  mdiContentCopy,
  mdiOpenInApp,
  mdiViewAgendaOutline,
  mdiViewGridOutline,
} from '@mdi/js';
import ContextMenuWrapper from '../components/ContextMenuWrapper.vue';
import Icon from '../components/Icon.vue';
import { ref, useTemplateRef } from 'vue';
import Popup from '../components/Popup.vue';
import { onKeyDown } from '@vueuse/core';

const screenshots = await window.api.invoke('getScreenshots');

const popup = useTemplateRef('popup');
const popupScreenshotIdx = ref(0);

function copy(instance: string | null, screenshot: string) {
  window.api.invoke('copyScreenshot', instance, screenshot);
}

function showInFileManager(instance: string | null, screenshot: string) {
  return window.api.invoke('showScreenshotInFileManager', instance, screenshot);
}

function openScreenshotPopup(index: number) {
  popupScreenshotIdx.value = index;
  popup.value?.openMenu();
}

onKeyDown(['ArrowRight', 'ArrowDown', 'j', 'l'], () => {
  if (popupScreenshotIdx.value >= screenshots.length - 1) {
    return;
  }

  popupScreenshotIdx.value++;
});

onKeyDown(['ArrowLeft', 'ArrowUp', 'h', 'k'], () => {
  if (popupScreenshotIdx.value < 1) {
    return;
  }

  popupScreenshotIdx.value--;
});

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
      <ContextMenuWrapper v-for="(screenshot, i) in screenshots">
        <template v-slot:content>
          <button
            class="btn-other screenshot-btn"
            @click="openScreenshotPopup(i)"
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
    <img :src="screenshots[popupScreenshotIdx].data" />
    <button
      @click="popupScreenshotIdx--"
      :disabled="popupScreenshotIdx < 1"
      class="btn-other previous"
    >
      <Icon :path="mdiArrowLeft" size="32" />
    </button>
    <button
      @click="popupScreenshotIdx++"
      :disabled="popupScreenshotIdx >= screenshots.length - 1"
      class="btn-other next"
    >
      <Icon :path="mdiArrowRight" size="32" />
    </button>
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

  & button.screenshot-btn {
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
  display: flex;
  position: relative;
  user-select: none;

  & button {
    all: unset;
    cursor: pointer;

    position: absolute;
    top: 0;
    bottom: 0;
    width: 8rem;

    opacity: 0;
    transition: opacity 0.25s;

    display: flex;
    align-items: center;
    justify-content: center;

    &.previous {
      left: 0;
      background-image: linear-gradient(
        90deg,
        var(--color-ui-layer),
        transparent
      );
      padding-right: 2rem;
      z-index: -1;
    }

    &.next {
      right: 0;
      background-image: linear-gradient(
        -90deg,
        var(--color-ui-layer),
        transparent
      );
      padding-left: 2rem;
      z-index: -1;
    }

    &:not(:disabled):hover,
    &:not(:disabled):focus-within {
      opacity: 1;
    }
  }

  & img {
    max-height: 90vh;
      z-index: -2;
  }
}
</style>
