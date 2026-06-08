<script setup lang="ts">
import { reactive, useTemplateRef, watch } from 'vue';
import { GeneralModpackOptions } from '../../../main/data/settings';
import Toggle from '../components/Toggle.vue';
import { log } from '../../../common/logging/log';
import { applyDefaults, clone } from '../../../common/utils';
import { mdiArrowRight } from '@mdi/js';
import Icon from './Icon.vue';
import ArgumentsPopup from './popup/ArgumentsPopup.vue';

type Props = {
  defaultSettings: GeneralModpackOptions;
};

const logger = log('general-instance-options');

const { defaultSettings } = defineProps<Props>();
const model = defineModel<Partial<GeneralModpackOptions>>();

const previousSettings = applyDefaults(model.value, defaultSettings);
const settings = reactive(clone(previousSettings));

const customJvmArgsPopup = useTemplateRef('custom-jvm-args-popup');
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

      previousSettings[key] = clone(settings[key]);
      model.value = clone(model.value);
    }
  }
});

function reset(key: keyof GeneralModpackOptions) {
  model.value![key] = undefined as never;

  settings[key] = defaultSettings[key] as never;
  model.value = clone(model.value);
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
      @contextmenu="reset('customJvmArgs')"
      :data-changed="isChanged('customJvmArgs')"
    >
      <div>Custom Jvm Args</div>
      <button @click="customJvmArgsPopup?.openMenu()">
        <span class="ellipsis">
          {{ settings.customJvmArgs.join(' ') }}
        </span>
        <Icon :path="mdiArrowRight" />
      </button>
    </label>

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

  <ArgumentsPopup ref="custom-jvm-args-popup" v-model="settings.customJvmArgs">
    Custom JVM Arguments
  </ArgumentsPopup>
  <ArgumentsPopup
    ref="custom-launch-args-popup"
    v-model="settings.customLaunchArgs"
  >
    Custom Launch Arguments
  </ArgumentsPopup>
</template>
