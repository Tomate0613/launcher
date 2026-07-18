<script setup lang="ts">
import { mdiContentCopy } from '@mdi/js';
import type { JavaPatchnotesEntry } from '../../../main/browse';
import ContextMenuWrapper from '../components/ContextMenuWrapper.vue';
import ImageIcon from '../components/ImageIcon.vue';
import Icon from '../components/Icon.vue';
import { formatTimeAgoIntl } from '@vueuse/core';

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
          <button @click="viewEntry(entry)" class="entry btn-other">
            <ImageIcon
              :src="`https://launchercontent.mojang.com/${entry.image.url}`"
              :alt="entry.image.title"
            />
            <div class="title">{{ entry.title }}</div>
            <div class="short-text">{{ entry.shortText }}</div>
            <span class="date">{{
              formatTimeAgoIntl(new Date(entry.date))
            }}</span>
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
    all: unset;

    cursor: pointer;

    /* font-size: 0.875rem; */

    display: flex;
    flex-direction: column;

    width: 100%;
    height: 100%;

    padding-top: 0;
    padding-bottom: 0;

    background-color: var(--color-ui-layer-dim);
    border-radius: var(--border-radius-strong);

    align-items: start;
    text-align: left;

    padding: 0.75rem;
    gap: 0.75rem;

    & h2 {
      /* TODO */
      margin: 0;
    }

    & img {
      width: 100%;
      border-radius: var(--border-radius);
    }

    & .short-text,
    & .date {
      color: var(--color-text-secondary);
      font-size: 0.75rem;
    }
  }

  & button.entry:hover {
    & .title {
      text-decoration: underline;
    }
  }
}
</style>
