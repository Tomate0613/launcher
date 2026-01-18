<script setup lang="ts">
import { reactive, useTemplateRef, watch } from 'vue';
import { GeneralModpackOptions } from '../../../main/data/settings';
import Toggle from '../components/Toggle.vue';
import { log } from '../../../common/logging/log';
import { applyDefaults, clone } from '../../../common/utils';
import Popup from './Popup.vue';
import {
  mdiArrowRight,
  mdiPlus,
  mdiTrashCanOutline,
} from '@mdi/js';
import Icon from './Icon.vue';

type Props = {
  defaultSettings: GeneralModpackOptions;
};

const logger = log('general-instance-options');

const { defaultSettings } = defineProps<Props>();
const model = defineModel<Partial<GeneralModpackOptions>>();

const previousSettings = applyDefaults(model.value, defaultSettings);
const settings = reactive(clone(previousSettings));

const customLaunchArgsPopup = useTemplateRef('custom-launch-args-popup');

watch(settings, () => {
  for (const key of Object.keys(defaultSettings)) {
    if (
      JSON.stringify(previousSettings[key]) != JSON.stringify(settings[key])
    ) {
      logger.log('Setting', key, 'is now', clone(settings[key]));

      if (
        JSON.stringify(settings[key]) == JSON.stringify(defaultSettings[key])
      ) {
        model.value![key] = undefined;
      } else {
        model.value![key] = settings[key];
      }

      previousSettings[key] = settings[key];
    }
  }
});

function reset(key: keyof GeneralModpackOptions) {
  model.value![key] = undefined as never;

  settings[key] = defaultSettings[key] as never;
}

function isChanged(key: keyof GeneralModpackOptions) {
  return model.value![key] !== undefined;
}
</script>

<template>
  <section class="settings-section">
    <div>
      <h2 class="settings-section-name">Memory</h2>
      <div class="settings-description">
        Control how much memory an instance can use
      </div>
    </div>
    <label
      class="settings-option"
      @contextmenu="reset('minRam')"
      :data-changed="isChanged('minRam')"
    >
      <div>Min</div>
      <input type="number" v-model="settings.minRam" />
    </label>
    <label
      class="settings-option"
      @contextmenu="reset('maxRam')"
      :data-changed="isChanged('maxRam')"
    >
      <div>Max</div>
      <input type="number" v-model="settings.maxRam" />
    </label>
  </section>

  <section class="settings-section">
    <h2 class="settings-section-name">Stash</h2>
    <label
      class="settings-option"
      @contextmenu="reset('stashComplete')"
      :data-changed="isChanged('stashComplete')"
    >
      <div>
        Complete Stash
        <div class="settings-description">
          Stash the entire instance folder instead of just config files and mods
        </div>
      </div>
      <Toggle v-model="settings.stashComplete" />
    </label>
    <label
      class="settings-option"
      @contextmenu="reset('stashLastLaunchEnabled')"
      :data-changed="isChanged('stashLastLaunchEnabled')"
    >
      <div>
        Automatically Backup
        <div class="settings-description">
          Create a stash after successfully launching an instance
        </div>
      </div>
      <Toggle v-model="settings.stashLastLaunchEnabled" />
    </label>
  </section>

  <section class="settings-section">
    <h2 class="settings-section-name">Advanced</h2>
    <label
      class="settings-option settings-option-button"
      @contextmenu="reset('customLaunchArgs')"
      :data-changed="isChanged('customLaunchArgs')"
    >
      <div>Custom Launch Args</div>
      <button @click="customLaunchArgsPopup?.openMenu()">
        <span class="ellipsis">
          {{ settings.customLaunchArgs.join(' ') }}
        </span>
        <Icon :path="mdiArrowRight" />
      </button>
    </label>
  </section>

  <Popup ref="custom-launch-args-popup">
    <h2>Custom Launch Arguments</h2>
    <div class="custom-launch-arg-list">
      <div
        v-for="(_, i) in settings.customLaunchArgs"
        class="custom-launch-arg-line"
      >
        <input type="text" v-model="settings.customLaunchArgs[i]" />
        <button
          @click="
            settings.customLaunchArgs = settings.customLaunchArgs.filter(
              (_, filterIdx) => filterIdx !== i,
            )
          "
        >
          <Icon :path="mdiTrashCanOutline" />
        </button>
      </div>
      <button class="icon-btn" @click="settings.customLaunchArgs.push('')">
        <Icon :path="mdiPlus" />
        Add new
      </button>
    </div>
  </Popup>
</template>

<style scoped>
.custom-launch-arg-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  & .custom-launch-arg-line {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    & input {
      width: 100%;
    }
  }

  & > button {
    justify-content: center;
  }
}
</style>
