<script setup lang="ts">
import { reactive, ref, toRaw, useTemplateRef, watch, watchEffect } from 'vue';
import { usePageFocus } from '../composables/pageFocus';
import { clone } from '../../../common/utils';
import { mdiArrowRight, mdiDelete, mdiDeleteOutline, mdiFolder, mdiTuneVariant } from '@mdi/js';
import Versions from '../components/Versions.vue';
import Icon from '../components/Icon.vue';
import GeneralInstanceOptions from '../components/GeneralInstanceOptions.vue';
import Toggle from '../components/Toggle.vue';
import { setTheme } from '../theme';
import SetMinecraftDefaultsPopup from '../components/popup/SetMinecraftDefaultsPopup.vue';
import '../assets/settings.css';
import type { WrapperOptions } from '../../../main/data/settings';
import Popup from '../components/Popup.vue';

const setMinecraftDefaultsPopup = useTemplateRef(
  'set-minecraft-defaults-popup',
);

const curseforgeTokenPopup = useTemplateRef('curseforge-token-popup');

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
const wrapper = ref(
  (await window.api.invoke('getSettingsProperty', 'wrapper')) as WrapperOptions,
);

const tokens = ref(await window.api.invoke('getTokens'));
const cfKey = ref<string>(tokens.value.hasCurseforgeToken ? 'a'.repeat(60) : '');

async function applyCurseforgeApiKey() {
  if(cfKey.value === 'a'.repeat(60)) {
    return;
  }

  await window.api.invoke('setCurseforgeToken', cfKey.value);
  curseforgeTokenPopup.value.closeMenu();
  tokens.value = await window.api.invoke('getTokens');
}

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
watch(
  [wrapper],
  () => {
    window.api.settings.setProperty('wrapper', toRaw(wrapper.value));
  },
  { deep: true },
);
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

      <section class="settings-section">
        <h2 class="settings-section-name">Wrapper</h2>

        <label
          class="settings-option"
          @contextmenu="wrapper.enabled = true"
          :data-changed="!wrapper.enabled"
        >
          <div>
            Enabled
            <div class="settings-description">
              Launch minecraft using wrapper allowing to reconnect to console
              after launcher closes
            </div>
          </div>
          <Toggle v-model="wrapper.enabled" />
        </label>

        <label
          class="settings-option"
          @contextmenu="wrapper.reopen = true"
          :data-changed="!wrapper.reopen"
        >
          <div>
            Reopen
            <div class="settings-description">
              Reopen and focus launcher when game exits
            </div>
          </div>
          <Toggle v-model="wrapper.reopen" :disabled="!wrapper.enabled" />
        </label>

        <label
          class="settings-option"
          @contextmenu="wrapper.autoClose = false"
          :data-changed="wrapper.autoClose"
        >
          <div>
            Close in Background
            <div class="settings-description">
              Close launcher when game launches
            </div>
          </div>
          <Toggle v-model="wrapper.autoClose" :disabled="!wrapper.enabled" />
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
