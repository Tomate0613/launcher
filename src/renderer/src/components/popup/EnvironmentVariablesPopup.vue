<script setup lang="ts">
import { mdiDeleteOutline, mdiPlus } from '@mdi/js';
import { ref, useTemplateRef, watch } from 'vue';
import Popup from '../Popup.vue';
import Icon from '../Icon.vue';

const popup = useTemplateRef('popup');

// This model is basically only one way
const model = defineModel<Record<string, string>>({
  required: true,
});

const entries = ref<[string, string][]>(Object.entries(model.value));

watch(model, (value) => {
  const next = Object.entries(value);

  if (JSON.stringify(next) !== JSON.stringify(entries.value)) {
    entries.value = next;
  }
});

//
function openMenu() {
  popup.value?.openMenu();
}

function closeMenu() {
  popup.value?.closeMenu();
}

function removeEntry(index: number) {
  entries.value = entries.value.filter((_, i) => i !== index);
  syncModel();
}

function addEntry() {
  entries.value.push(['', '']);
  syncModel();
}

function syncModel() {
  model.value = Object.fromEntries(entries.value);
}

defineExpose({
  openMenu,
  closeMenu,
});
</script>

<template>
  <Popup ref="popup">
    <h2>Environment Variables</h2>

    <div class="custom-arg-list" v-if="entries">
      <div v-for="(_, i) in entries" class="custom-launch-arg-line">
        <input type="text" v-model="entries[i][0]" @blur="syncModel()" />
        <input type="text" v-model="entries[i][1]" @blur="syncModel()" />
        <button @click="removeEntry(i)">
          <Icon :path="mdiDeleteOutline" />
        </button>
      </div>
      <button class="icon-btn" @click="addEntry()">
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
