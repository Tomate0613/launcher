<script setup lang="ts">
import {
  mdiArrowLeft,
  mdiArrowRight,
  mdiContentCopy,
  mdiOpenInApp,
} from '@mdi/js';
import ContextMenuWrapper from '../components/ContextMenuWrapper.vue';
import Icon from '../components/Icon.vue';
import { ref, useTemplateRef } from 'vue';
import Popup from '../components/Popup.vue';
import { onKeyDown } from '@vueuse/core';
import CardGridPage from '../components/CardGridPage.vue';
import { useNavigationInput } from '../composables/navigationInput';

const screenshots = await window.api.invoke('getScreenshots');

const popup = useTemplateRef('popup');
const popupScreenshotIdx = ref(0);
const popupFullscreen = ref(false);

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

onKeyDown(['ArrowRight', 'ArrowDown', 'j', 'l'], () => {});

onKeyDown(['ArrowLeft', 'ArrowUp', 'h', 'k'], () => {});

useNavigationInput((action) => {
  if (action === 'right' || action === 'down') {
    if (popupScreenshotIdx.value >= screenshots.length - 1) {
      return;
    }

    popupScreenshotIdx.value++;
  }

  if (action === 'left' || action === 'up') {
    if (popupScreenshotIdx.value < 1) {
      return;
    }

    popupScreenshotIdx.value--;
  }

  if (action === 'cancel') {
    popup.value?.closeMenu();
  }
});
</script>
<template>
  <div class="page-header"></div>
  <div class="page-content">
    <CardGridPage class="screenshots" v-if="screenshots">
      <ContextMenuWrapper v-for="(screenshot, i) in screenshots">
        <template v-slot:content>
          <button
            class="btn-other screenshot-btn card"
            @click="openScreenshotPopup(i)"
            @keydown.enter.stop="openScreenshotPopup(i)"
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
    </CardGridPage>
  </div>

  <Popup
    ref="popup"
    class="screenshot-popup"
    :class="{ fullscreen: popupFullscreen }"
  >
    <img
      :src="screenshots[popupScreenshotIdx].data"
      tabindex="-1"
      @dblclick="popupFullscreen = !popupFullscreen"
    />

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

    &:focus-visible {
      outline: 2px solid var(--color-accent);
    }
  }
}

.screenshot-popup {
  &:open {
    display: flex;
  }

  position: relative;
  user-select: none;

  padding: 2.5rem;
  padding-top: 2.5rem;
  padding-bottom: 2.5rem;

  align-items: center;
  justify-content: center;

  & button {
    all: unset;
    cursor: pointer;

    position: absolute;
    top: 0;
    bottom: 0;
    width: 8rem;

    opacity: 0;
    transition: opacity 200ms;

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
    &:not(:disabled):focus-visible {
      opacity: 1;
    }
  }

  & img {
    max-height: 90vh;
    z-index: -2;
    width: auto;
    max-width: 100%;
    height: auto;
  }
}
</style>
