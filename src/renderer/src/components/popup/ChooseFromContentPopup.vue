<script setup lang="ts">
import { capitalize, computed, useTemplateRef } from 'vue';
import { ContentItem } from '../../../../main/data/content/content';
import ImageIcon from '../ImageIcon.vue';
import Popup from '../Popup.vue';
import { useSyncedIdSetReactive } from '../../composables/syncedIdSet';

const p = defineProps<{
  modpackId: string;
  contentType: string;
}>();

const emit = defineEmits<{ chooseItemIcon: [string] }>();

const popup = useTemplateRef('content-popup');

const setId = computed(() => `${p.modpackId}-${p.contentType}`);
const content = useSyncedIdSetReactive<ContentItem>(setId);

function singularize(word: string) {
  return word.endsWith('s') ? word.slice(0, -1) : word;
}

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
  <Popup ref="content-popup">
    <h2>{{ capitalize(singularize(contentType)) }} Icon</h2>

    <div class="content">
      <button
        v-for="item in Array.from(content?.values() ?? []).filter(
          (item) => item.project?.icon,
        )"
        class="icon-btn"
        @click="
          emit('chooseItemIcon', item.project!.icon!);
          closeMenu();
        "
      >
        <ImageIcon class="image-icon" :src="item.project!.icon" width="50px" />
        {{ item.project?.name }}
      </button>
    </div>
  </Popup>
</template>

<style scoped>
.popup {
  gap: 1rem;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.image-icon {
  border-radius: var(--border-radius);
}
</style>
