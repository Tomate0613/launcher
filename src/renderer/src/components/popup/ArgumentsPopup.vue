<script setup lang="ts">
import { mdiDeleteOutline, mdiPlus } from '@mdi/js';
import { useTemplateRef } from 'vue';
import Popup from './../Popup.vue';
import Icon from '../Icon.vue';

const popup = useTemplateRef('popup');
const model = defineModel<string[]>();

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
    <h2><slot /></h2>
    <div class="custom-arg-list" v-if="model">
      <div v-for="(_, i) in model" class="custom-launch-arg-line">
        <input type="text" v-model="model[i]" />
        <button
          @click="model = model.filter((_, filterIdx) => filterIdx !== i)"
        >
          <Icon :path="mdiDeleteOutline" />
        </button>
      </div>
      <button class="icon-btn" @click="model.push('')">
        <Icon :path="mdiPlus" />
        Add new
      </button>
    </div>
  </Popup>
</template>

<style scoped>
.custom-arg-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  & .custom-launch-arg-line {
    display: flex;
    gap: 0.375rem;

    & input {
      flex-grow: 1;
    }
  }

  & > button {
    justify-content: center;
  }
}
</style>
