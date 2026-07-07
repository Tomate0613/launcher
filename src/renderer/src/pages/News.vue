<script setup lang="ts">
import ContextMenuWrapper from '../components/ContextMenuWrapper.vue';
import Icon from '../components/Icon.vue';
import type { JavaPatchnotesEntry } from '../../../main/browse';
import { mdiContentCopy } from '@mdi/js';

const javaPatchNotes = await window.api.invoke('getJavaPatchnotes');

function viewEntry(selected: JavaPatchnotesEntry) {
  window.api.invoke('viewJavaPatchnoteEntry', selected.version);
}

function copy(selected: JavaPatchnotesEntry) {
  const url = `https://quiltmc.org/en/mc-patchnotes/#${selected.version}`
  navigator.clipboard.writeText(url);
}
</script>

<template>
  <div class="page-header" />
  <div class="page-content">
    <div class="page-scrollable news">
      <ContextMenuWrapper v-for="entry in javaPatchNotes.entries">
        <template v-slot:content>
          <button @click="viewEntry(entry)" class="entry">
            <h2>{{ entry.title }}</h2>
            <img
              :src="`https://launchercontent.mojang.com/${entry.image.url}`"
            />
            <div class="short-text">{{ entry.shortText }}</div>
          </button>
        </template>
        <template v-slot:context-menu>
          <button
            class="icon-btn"
            @click="copy(entry)"
          >
            <Icon :path="mdiContentCopy" />
            Copy URL
          </button>
        </template>
      </ContextMenuWrapper>
    </div>
  </div>
</template>

<style scoped>
.news {
  padding-top: 0;
  gap: 0.5rem;

  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  grid-auto-rows: min-content;

  & button.entry {
    display: flex;
    flex-direction: column;
    height: 100%;

    padding-top: 0;
    padding-bottom: 0;

    & h2 {
      margin: 0.5rem 0;
    }

    & img {
      width: 100%;
      border-radius: var(--border-radius);
    }

    & .short-text {
      padding: 1rem;
    }
  }
}
</style>
