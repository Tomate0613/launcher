<script setup lang="ts">
import { ref, useTemplateRef, watchEffect } from 'vue';
import { usePageFocus } from '../composables/pageFocus';
import { mdiArrowRight, mdiDeleteOutline, mdiFolder, mdiTuneVariant } from '@mdi/js';
import Versions from '../components/Versions.vue';
import Icon from '../components/Icon.vue';
import GeneralInstanceOptions from '../components/GeneralInstanceOptions.vue';
import Toggle from '../components/Toggle.vue';
import { setTheme } from '../theme';
import SetMinecraftDefaultsPopup from '../components/popup/SetMinecraftDefaultsPopup.vue';
import '../assets/settings.css';
import Popup from '../components/Popup.vue';
import { useAppState } from '../composables/appState';

const { settings } = await useAppState();

const setMinecraftDefaultsPopup = useTemplateRef(
  'set-minecraft-defaults-popup',
);

const curseforgeTokenPopup = useTemplateRef('curseforge-token-popup');

const defaultGeneralModpackSettings = await window.api.invoke(
  'getDefaultGeneralModpackOptions',
);

usePageFocus();

function openRootFolder() {
  return window.api.invoke('openBaseFolder');
}

const themes = await window.api.invoke('getThemes');
const tokens = ref(await window.api.invoke('getTokens'));
const cfKey = ref<string>(tokens.value.hasCurseforgeToken ? 'a'.repeat(60) : '');

async function applyCurseforgeApiKey() {
  if(cfKey.value === 'a'.repeat(60)) {
    return;
  }

  await window.api.invoke('setCurseforgeToken', cfKey.value);
  curseforgeTokenPopup.value?.closeMenu();
  tokens.value = await window.api.invoke('getTokens');
}

watchEffect(() => {
  setTheme(themes.find((t) => t.id == settings.theme)?.url);
});
</script>

<template>
  <div class="page-content">
    <div class="page-scrollable settings">
      <GeneralInstanceOptions
        v-model="settings.modpackDefaultOptions"
        :defaultSettings="defaultGeneralModpackSettings"
      />
      <section class="settings-section">
        <h2 class="settings-section-name">UI</h2>
        <label
          class="settings-option"
          @contextmenu="settings.theme = 'default'"
          :data-changed="settings.theme != 'default'"
        >
          Theme
          <select v-model="settings.theme">
            <option value="default">Default</option>
            <option v-for="theme in themes" :value="theme.id">
              {{ theme.name }}
            </option>
          </select>
        </label>
        <label
          class="settings-option"
          @contextmenu="settings.transparentWindow = false"
          :data-changed="settings.transparentWindow"
        >
          <div>
            Transparent Background
            <div class="settings-description">
              Only works with specific themes. Requires a restart to apply
            </div>
          </div>
          <Toggle v-model="settings.transparentWindow" />
        </label>
        <label
          class="settings-option"
          @contextmenu="settings.hideFrame = false"
          :data-changed="settings.hideFrame"
        >
          <div>
            Hide Frame
            <div class="settings-description">Requires a restart to apply</div>
          </div>
          <Toggle v-model="settings.hideFrame" />
        </label>
      </section>

      <section class="settings-section">
        <h2 class="settings-section-name">Wrapper</h2>

        <label
          class="settings-option"
          @contextmenu="settings.wrapper.enabled = true"
          :data-changed="!settings.wrapper.enabled"
        >
          <div>
            Enabled
            <div class="settings-description">
              Launch minecraft using wrapper allowing to reconnect to console
              after launcher closes
            </div>
          </div>
          <Toggle v-model="settings.wrapper.enabled" />
        </label>

        <label
          class="settings-option"
          @contextmenu="settings.wrapper.reopen = true"
          :data-changed="!settings.wrapper.reopen"
        >
          <div>
            Reopen
            <div class="settings-description">
              Reopen and focus launcher when game exits
            </div>
          </div>
          <Toggle v-model="settings.wrapper.reopen" :disabled="!settings.wrapper.enabled" />
        </label>

        <label
          class="settings-option"
          @contextmenu="settings.wrapper.autoClose = false"
          :data-changed="settings.wrapper.autoClose"
        >
          <div>
            Close in Background
            <div class="settings-description">
              Close launcher when game launches
            </div>
          </div>
          <Toggle v-model="settings.wrapper.autoClose" :disabled="!settings.wrapper.enabled" />
        </label>
      </section>

      <section>
        <h2 class="settings-section-name">Providers</h2>

        <label class="settings-option settings-option-button">
          Modrinth
          <button>Enabled <Icon :path="mdiArrowRight" /></button>
        </label>

        <label class="settings-option settings-option-button">
          Curseforge
          <button @click="curseforgeTokenPopup?.openMenu()">
            {{ (tokens.hasCurseforgeToken || tokens.compiledWithCurseforgeToken) ? 'Enabled' : 'Disabled' }}
            <Icon :path="mdiArrowRight" />
          </button>
        </label>
      </section>

      <section>
        <h2 class="settings-section-name">Storage</h2>

        <label class="settings-option settings-option-button">
          Garbage Collection
          <select v-model="settings.store.gcSchedule">
            <option value="weekly">Weekly</option>
            <option value="on-close">On Close</option>
          </select>
        </label>

        <label class="settings-option settings-option-button">
          Storage
          <button disabled>
            <Icon :path="mdiArrowRight" />
          </button>
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

  <Popup ref="curseforge-token-popup" class="curseforge-token-popup">
    <h2>Curseforge</h2>

    <div class="description">
      <template v-if="!tokens.compiledWithCurseforgeToken">
        To be able to use Curseforge features an api key is required
      </template>
      <template v-else>
        Override built-in Curseforge api key
      </template>

      <br />
      A key can be acquired at
      <a href="https://console.curseforge.com/#/api-keys" target="_blank">
        https://console.curseforge.com/#/api-keys
      </a>
    </div>

    <div class="token-row">
      <input type="password" v-model="cfKey"></input>
      <button @click="cfKey = ''">
        <Icon :path="mdiDeleteOutline" />
      </button>
    </div>
    <hr />
    <button @click="applyCurseforgeApiKey">Done</button>
  </Popup>
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

.curseforge-token-popup {
  & .description {
    color: var(--color-text-secondary);

    padding-bottom: 1rem;
  }

  & .token-row {
    display: flex;
    gap: 0.375rem;

    & input {
      flex-grow: 1;
    }
  }
}
</style>
