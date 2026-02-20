<script setup lang="ts">
import { reactive, ref, useTemplateRef, watch, watchEffect } from 'vue';
import { usePageFocus } from '../composables/pageFocus';
import { clone } from '../../../common/utils';
import { mdiFolder, mdiTuneVariant } from '@mdi/js';
import Versions from '../components/Versions.vue';
import Icon from '../components/Icon.vue';
import GeneralInstanceOptions from '../components/GeneralInstanceOptions.vue';
import Toggle from '../components/Toggle.vue';
import { setTheme } from '../theme';
import SetMinecraftDefaultsPopup from '../components/popup/SetMinecraftDefaultsPopup.vue';
import '../assets/settings.css';

const setMinecraftDefaultsPopup = useTemplateRef(
  'set-minecraft-defaults-popup',
);

let instanceDefaultOptions = reactive(
  await window.api.settings.getProperty('modpackDefaultOptions'),
);

const defaultGeneralModpackSettings = await window.api.invoke(
  'getDefaultGeneralModpackOptions',
);

usePageFocus();

watch(instanceDefaultOptions, async () => {
  await window.api.settings.setProperty(
    'modpackDefaultOptions',
    clone(instanceDefaultOptions),
  );
});

function openRootFolder() {
  return window.api.invoke('openBaseFolder');
}

const theme = ref(
  ((await window.api.invoke('getSettingsProperty', 'theme')) as string) ??
    'default',
);
const themes = await window.api.invoke('getThemes');
const transparentWindow = ref(
  (await window.api.invoke(
    'getSettingsProperty',
    'transparentWindow',
  )) as boolean,
);
const hideFrame = ref(
  (await window.api.invoke('getSettingsProperty', 'hideFrame')) as boolean,
);

watchEffect(() => {
  setTheme(themes.find((t) => t.id == theme.value)?.url);
});

watchEffect(() => {
  window.api.settings.setProperty('theme', theme.value);
});
watchEffect(() => {
  window.api.settings.setProperty('transparentWindow', transparentWindow.value);
});
watchEffect(() => {
  window.api.settings.setProperty('hideFrame', hideFrame.value);
});
</script>

<template>
  <div class="page-content">
    <div class="page-scrollable settings">
      <GeneralInstanceOptions
        v-model="instanceDefaultOptions"
        :defaultSettings="defaultGeneralModpackSettings"
      />
      <section class="settings-section">
        <h2 class="settings-section-name">UI</h2>
        <label
          class="settings-option"
          @contextmenu="theme = 'default'"
          :data-changed="theme != 'default'"
        >
          Theme
          <select v-model="theme">
            <option value="default">Default</option>
            <option v-for="theme in themes" :value="theme.id">
              {{ theme.name }}
            </option>
          </select>
        </label>
        <label
          class="settings-option"
          @contextmenu="transparentWindow = false"
          :data-changed="transparentWindow"
        >
          <div>
            Transparent Background
            <div class="settings-description">
              Only works with specific themes. Requires a restart to apply
            </div>
          </div>
          <Toggle v-model="transparentWindow" />
        </label>
        <label
          class="settings-option"
          @contextmenu="hideFrame = false"
          :data-changed="hideFrame"
        >
          <div>
            Hide Frame
            <div class="settings-description">Requires a restart to apply</div>
          </div>
          <Toggle v-model="hideFrame" />
        </label>
      </section>

      <div class="flex-row justify-space-between">
        <Versions />
        <div class="extra-buttons">
          <button
            class="icon-btn"
            @click="setMinecraftDefaultsPopup?.openMenu()"
          >
            <Icon :path="mdiTuneVariant" />
            Set Minecraft Defaults
          </button>
          <button class="icon-btn" @click="openRootFolder">
            <Icon :path="mdiFolder" />
            Open Launcher Root
          </button>
        </div>
      </div>
    </div>
  </div>

  <SetMinecraftDefaultsPopup ref="set-minecraft-defaults-popup" />
</template>

<style scoped>
.settings {
  max-width: 720px;
  margin-inline: auto;
  gap: 2rem;
}

.extra-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
</style>
