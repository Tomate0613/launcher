<script setup lang="ts">
import { reactive, useTemplateRef, watch } from 'vue';
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

const logger = log('instance-settigns');

const route = useRoute();
const modpackId = route.params.id as string;

const iconChooser = useTemplateRef('icon-chooser');
const checkContentUpdatePopup = useTemplateRef('check-content-update-popup');

const instance = reactive(await window.api.invoke('getModpackData', modpackId));

const instanceDefaultOptions = await window.api.invoke(
  'getDefaulltModpackOptions',
);

let options = reactive(instance.modpackOptions ?? {});

watch(options, async () => {
  instance.modpackOptions = clone(options);
});

watch(instance, async () => {
  await window.api.invoke('setModpackConfig', clone(instance));
});

watch(
  () => [instance.loader.id, instance.gameVersion],
  () => {
    logger.log('watch');
    checkContentUpdatePopup.value?.checkMods();
  },
);
</script>

<template>
  <div class="page-content">
    <div class="page-scrollable settings">
      <section class="settings-section">
        <h2 class="settings-section-name">General</h2>
        <label class="settings-option settings-option-text">
          <div>Name</div>
          <input type="text" v-model="instance.name" />
          <Icon :path="mdiPencil" class="settings-edit-icon" />
        </label>
        <label class="settings-option settings-option-text">
          <div>Description</div>
          <input type="text" v-model="instance.description" />
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
          <LoaderSelect v-model="instance.loader.id" />
        </label>
        <label class="settings-option">
          Mod Loader Version
          <LoaderVersionSelect
            v-if="instance.loader.id !== 'vanilla'"
            v-model="instance.loader.version"
            :loader="instance.loader.id"
            :game-version="instance.gameVersion"
          />
        </label>
        <label class="settings-option">
          <div>Game Version</div>
          <div>
            <GameVersionSelect
              :loader="instance.loader.id"
              v-model="instance.gameVersion"
            />
          </div>
        </label>
      </section>

      <GeneralInstanceOptions
        v-model="options"
        :defaultSettings="instanceDefaultOptions"
      />
    </div>
  </div>

  <ChooseIconPopup ref="icon-chooser" :instance="instance" />

  <CheckContentUpdatesPopups
    ref="check-content-update-popup"
    content-type="mods"
    :instance-id="instance.id"
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
