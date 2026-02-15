<script setup lang="ts">
import { reactive, ref, watch, watchEffect } from 'vue';
import { usePageFocus } from '../composables/pageFocus';
import { clone } from '../../../common/utils';
import { mdiFolder } from '@mdi/js';
import Versions from '../components/Versions.vue';
import Icon from '../components/Icon.vue';
import GeneralInstanceOptions from '../components/GeneralInstanceOptions.vue';
import Toggle from '../components/Toggle.vue';
import { setTheme } from '../theme';

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
        <div>
          <button class="icon-btn" @click="openRootFolder">
            <Icon :path="mdiFolder" />
            Open Launcher Root
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings {
  max-width: 720px;
  margin-inline: auto;
  gap: 2rem;
}
</style>

<style>
.settings-section {
  display: flex;
  flex-direction: column;
}

.settings-section-name {
  margin-block: 0;
  font-size: 1.25rem;
}

.settings-description {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.settings-option {
  display: flex;
  padding: 0.5rem;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  background-color: var(--color-ui-layer-dim);
  border-bottom: 2px solid var(--color-background);
  box-shadow: 0 2px 4px var(--color-shadow-light);
  clip-path: inset(0 -1rem 0 -1rem);
  min-height: 3.5rem;
  transition: background-color 0.25s;

  &:first-of-type {
    margin-top: 0.5rem;
    border-top-left-radius: 0.5rem;
    border-top-right-radius: 0.5rem;
    clip-path: inset(-1rem -1rem 0 -1rem);
  }

  &:last-of-type {
    border: none;
    border-bottom-left-radius: 0.5rem;
    border-bottom-right-radius: 0.5rem;
    clip-path: inset(0 -1rem -1rem -1rem);
  }

  &:only-of-type {
    clip-path: none;
  }

  &.align-start {
    align-items: start;
  }

  & .settings-description {
    margin-top: 0.25rem;
  }

  &:hover {
    background-color: color-mix(
      in oklab,
      var(--color-ui-layer-dim),
      white 2.5%
    );
  }

  &.settings-option-text {
    display: flex;
    flex-direction: column;
    position: relative;
    cursor: text;

    & div {
      font-size: 0.75rem;
      align-self: self-start;
      color: var(--color-text-secondary);
    }

    & input {
      height: auto;
      width: 100%;
      border: none;
      background: unset;
      padding: 0;
    }

    & .settings-edit-icon {
      cursor: default;
      position: absolute;
      right: 1rem;
      top: 1rem;
      opacity: 1;
      transition: opacity 0.1s;
    }

    &:focus-within {
      outline: 2px solid var(--color-accent);
      outline-offset: -2px;

      & .settings-edit-icon {
        opacity: 0;
      }
    }
  }

  &.settings-option-button {
    gap: 5rem;
    & > div {
      flex: 0 0 auto;
    }

    & button {
      all: unset;
      padding: 0.5rem;
      display: inline-flex;
      gap: 0.5rem;
      align-items: center;
      min-width: 0;

      &:disabled {
        opacity: .5;
      }

      & svg {
        flex: 0 0 auto;
      }

      & span {
        color: var(--color-text-secondary);
        overflow: hidden;
        white-space: nowrap;
      }
    }
  }
}
</style>
