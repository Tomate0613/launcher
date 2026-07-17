<script setup lang="ts">
import { mdiContentCopy } from '@mdi/js';
import type { JavaPatchnotesEntry } from '../../../main/browse';
import ContextMenuWrapper from '../components/ContextMenuWrapper.vue';
import ImageIcon from '../components/ImageIcon.vue';
import Icon from '../components/Icon.vue';

const javaPatchNotes = await window.api
  .invoke('getJavaPatchnotes')
  .catch(() => ({
    entries: [],
  }));

function viewEntry(selected: JavaPatchnotesEntry) {
  window.api.invoke('viewJavaPatchnoteEntry', selected.version);
}

function copy(selected: JavaPatchnotesEntry) {
  const url = `https://quiltmc.org/en/mc-patchnotes/#${selected.version}`;
  navigator.clipboard.writeText(url);
}
</script>

<template>
  <div class="page-header" />
  <div class="page-content">
    <div class="page-scrollable news card-grid">
      <ContextMenuWrapper v-for="entry in javaPatchNotes.entries">
        <template v-slot:content>
          <button @click="viewEntry(entry)" class="entry">
            <h2>{{ entry.title }}</h2>
            <ImageIcon
              :src="`https://launchercontent.mojang.com/${entry.image.url}`"
              :alt="entry.image.title"
            />
            <div class="short-text">{{ entry.shortText }}</div>
          </button>
        </template>
        <template v-slot:context-menu>
          <button class="icon-btn" @click="copy(entry)">
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
  & button.entry {
    display: flex;
    flex-direction: column;
    height: 100%;

    padding-top: 0;
    padding-bottom: 0;

    background-color: var(--color-ui-layer-dim);
    border-radius: var(--border-radius-strong);

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
