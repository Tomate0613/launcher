<script setup lang="ts">
import FilePickerButton from '../FilePickerButton.vue';
import {
  mdiImport,
  mdiLightbulbOnOutline,
  mdiPackageVariantClosed,
  mdiPaletteSwatchOutline,
  mdiRefresh,
} from '@mdi/js';
import Icon from '../Icon.vue';
import Popup from '../Popup.vue';
import { ref, useTemplateRef } from 'vue';
import { log } from '../../../../common/logging/log';
import ChooseFromContentPopup from './ChooseFromContentPopup.vue';
import type { ContentType } from '../../../../main/data/content/content';
import type { ModpackFrontendData } from '../../../../main/data/modpack';
import ImageIcon from '../ImageIcon.vue';

const { instance } = defineProps<{ instance: ModpackFrontendData }>();
const popup = useTemplateRef('popup');

const logger = log('choose-item-popup');

const iconFilePicker = useTemplateRef('icon-file-picker');
const contentPopup = useTemplateRef('content-popup');
const modIconPopupIsOpen = ref(false);
const contentType = ref<ContentType>('mods');

function onChooseIconFile() {
  const files = iconFilePicker.value?.fileInput?.files;

  if (!files) {
    return;
  }

  if (files.length) {
    const file = files.item(0);

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      window.api
        .invoke('setModpackIconFromFile', instance.id, buffer)
        .catch(logger.error.bind(logger));
    };
    reader.readAsArrayBuffer(file);
  }

  popup.value?.closeMenu();
}

function setIconSpecial(variant: 'default') {
  return window.api.invoke('setModpackIconSpecial', instance.id, variant);
}

async function setIconFromUrl(url: string) {
  await window.api.invoke('setModpackIconFromUrl', instance.id, url);
  popup.value?.closeMenu();
}

function openMenu() {
  popup.value?.openMenu();
}

function closeMenu() {
  popup.value?.closeMenu();
}

defineExpose({
  openMenu,
  closeMenu,
});
</script>

<template>
  <Popup ref="popup">
    <h2>Icon</h2>

    <div class="image-container">
      <ImageIcon class="image-icon" :src="instance.icon" />
    </div>

    <hr />

    <div class="icon-actions">
      <button
        class="icon-btn"
        @click="
          setIconSpecial('default');
          popup?.closeMenu();
        "
      >
        <Icon :path="mdiRefresh" />
        Reset
      </button>
      <FilePickerButton
        accept=".png,image/png"
        ref="icon-file-picker"
        @change="onChooseIconFile"
      >
        <Icon :path="mdiImport" />
        File
      </FilePickerButton>
      <button
        class="icon-btn"
        @click="
          contentType = 'mods';
          contentPopup?.openMenu();
        "
        v-if="instance.loader.id !== 'vanilla'"
      >
        <Icon :path="mdiPackageVariantClosed" />
        Mod Icon
      </button>
      <button
        class="icon-btn"
        @click="
          contentType = 'shaderpacks';
          contentPopup?.openMenu();
        "
      >
        <Icon :path="mdiLightbulbOnOutline" />
        Shaderpack Icon
      </button>
      <button
        class="icon-btn"
        @click="
          contentType = 'resourcepacks';
          contentPopup?.openMenu();
        "
      >
        <Icon :path="mdiPaletteSwatchOutline" />
        Resourcepack Icon
      </button>
    </div>
  </Popup>
  <ChooseFromContentPopup
    ref="content-popup"
    :modpack-id="instance.id"
    v-model="modIconPopupIsOpen"
    :content-type="contentType"
    @choose-item-icon="setIconFromUrl"
  />
</template>

<style scoped>
.icon-actions {
  display: flex;
  flex-direction: column;

  gap: 0.25rem;

  & :global(.fake-btn) {
    width: 100%;
  }
}

.image-container {
  display: flex;
  justify-content: center;
}

.image-icon {
  align-self: center;
  justify-content: center;
  width: 6rem;
  border-radius: var(--border-radius);
}
</style>
