<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import GeneralInstanceOptions from '../components/GeneralInstanceOptions.vue';
import GameVersionSelect from '../components/select/GameVersionSelect.vue';
import { clone } from '../../../common/utils';
import LoaderSelect from '../components/select/LoaderSelect.vue';
import LoaderVersionSelect from '../components/select/LoaderVersionSelect.vue';
import Icon from '../components/Icon.vue';
import { mdiArrowRight, mdiPencil } from '@mdi/js';
import ChooseIconPopup from '../components/popup/ChooseIconPopup.vue';
import CheckContentUpdatesPopups from '../components/popup/CheckContentUpdatesPopups.vue';
import { log } from '../../../common/logging/log';
import { useAppState } from '../composables/appState';
import { useDebounceFn } from '@vueuse/core';
import { ModpackData } from '../../../main/data/modpack';

const logger = log('instance-settigns');

const route = useRoute();
const modpackId = computed(() => route.params.id as string);

const { modpacks } = await useAppState();
const instance = computed(() =>
  clone(modpacks.values().find((modpack) => modpack.id === modpackId.value)!),
);

const settingsInstance = ref(clone(instance.value));

const iconChooser = useTemplateRef('icon-chooser');
const checkContentUpdatePopup = useTemplateRef('check-content-update-popup');

const instanceDefaultOptions = await window.api.invoke(
  'getDefaultModpackOptions',
);

const options = computed({
  get: () => settingsInstance.value.modpackOptions ?? {},
  set: (val) => {
    settingsInstance.value.modpackOptions = clone(val);
  },
});

watch(instance, async () => {
  settingsInstance.value = clone(instance.value);
});

const save = useDebounceFn(async (curr: ModpackData) => {
  if (JSON.stringify(curr) === JSON.stringify(instance.value)) {
    return;
  }

  if (
    curr.loader.id !== instance.value.loader.id ||
    curr.gameVersion !== instance.value.gameVersion
  ) {
    checkContentUpdatePopup.value?.checkMods();
  }

  logger.log('Updating');
  await window.api.invoke('setModpackConfig', clone(settingsInstance.value));
}, 300);

watch(settingsInstance, save, { deep: true });
</script>

<template>
  <div class="page-content">
    <div class="page-scrollable settings">
      <section class="settings-section">
        <h2 class="settings-section-name">General</h2>
        <label class="settings-option settings-option-text">
          <div>Name</div>
          <input type="text" v-model="settingsInstance.name" />
          <Icon :path="mdiPencil" class="settings-edit-icon" />
        </label>
        <label class="settings-option settings-option-text">
          <div>Description</div>
          <input type="text" v-model="settingsInstance.description" />
          <Icon :path="mdiPencil" class="settings-edit-icon" />
        </label>
        <label class="settings-option settings-option-button">
          Icon
          <button @click="iconChooser?.openMenu()">
            <Icon :path="mdiArrowRight" />
          </button>
        </label>
        <label class="settings-option">
          <div>Mod Loader</div>
          <LoaderSelect v-model="settingsInstance.loader.id" />
        </label>
        <label class="settings-option">
          Mod Loader Version
          <LoaderVersionSelect
            v-if="settingsInstance.loader.id !== 'vanilla'"
            v-model="settingsInstance.loader.version"
            :loader="settingsInstance.loader.id"
            :game-version="settingsInstance.gameVersion"
          />
        </label>
        <label class="settings-option">
          <div>Game Version</div>
          <div>
            <GameVersionSelect
              :loader="settingsInstance.loader.id"
              v-model="settingsInstance.gameVersion"
            />
          </div>
        </label>
        <label class="settings-option settings-option-button">
          <div>Java Executable</div>

          <button disabled>
            <!-- TODO -->
            <span>{{ settingsInstance.java ?? 'Automatic' }}</span>
            <Icon :path="mdiArrowRight" />
          </button>
        </label>
      </section>

      <GeneralInstanceOptions
        v-model="options"
        :defaultSettings="instanceDefaultOptions"
      />
    </div>
  </div>

  <ChooseIconPopup ref="icon-chooser" :instance="settingsInstance" />

  <CheckContentUpdatesPopups
    ref="check-content-update-popup"
    content-type="mods"
    :instance-id="modpackId"
  />
</template>

<style scoped>
.multi-line {
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: 0.5rem;
}
</style>
