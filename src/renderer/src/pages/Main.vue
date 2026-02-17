<script setup lang="ts">
import { onBeforeUnmount, ref, useTemplateRef } from 'vue';
import Sidebar from '../components/Sidebar.vue';
import { useDownloadState } from '../composables/downloadState';
import Popup from '../components/Popup.vue';
import FrontendErrorPopup from '../components/popup/FrontendErrorPopup.vue';

const progress = ref(0);

const cleanupProgressHandler = window.api.on(
  'progress',
  (_event, p: number) => {
    progress.value = p * 100;
  },
);

const downloads = await useDownloadState();

const progressPopup = useTemplateRef('progress-popup');

onBeforeUnmount(() => {
  cleanupProgressHandler();
});
</script>

<template>
  <div class="view">
    <Sidebar />
    <div class="page">
      <RouterView />
    </div>
  </div>
  <div class="progress-bar" @click="progressPopup?.openMenu">
    <div
      class="progress"
      :class="{ loading: progress, waiting: progress === 100 }"
      :style="{ width: `${progress}%` }"
    ></div>
  </div>

  <Popup ref="progress-popup">
    <h2>Downloads</h2>
    <div class="progress-popup-line" v-for="download in downloads.values()">
      <span>{{ download.name }}</span>
      <progress
        class="progress-popup-progress-bar"
        :value="download.progress"
      />
    </div>
  </Popup>

  <FrontendErrorPopup />
</template>

<style scoped>
.view {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
}

.progress-bar {
  padding-block: 0;
  padding-inline: 1rem;
  transition: padding 200ms;
  cursor: pointer;

  &:has(.loading) {
    padding-bottom: 1rem;
  }

  &:hover .progress {
    background-color: color-mix(in oklab, var(--color-green), white 25%);
  }
}

.progress {
  height: 0;
  background-color: var(--color-green);
  border-radius: 0.25rem;
  transition: height 200ms;

  &.loading {
    height: 1rem;
  }

  &.waiting {
    --color-stripe: color-mix(in oklab, var(--color-green), black 25%);

    background-image: linear-gradient(
      -45deg,
      var(--color-stripe) 25%,
      transparent 25%,
      transparent 50%,
      var(--color-stripe) 50%,
      var(--color-stripe) 75%,
      transparent 75%
    );
    background-size: 1rem 1rem;
    animation: progress-loading 1s linear infinite;
  }
}

@keyframes progress-loading {
  from {
    background-position: 0 0;
  }
  to {
    background-position: 1rem 1rem;
  }
}

.progress-popup-line {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.5rem;
  & span {
    font-size: 0.875rem;
    text-align: right;
    flex-grow: 1;
  }
}

progress.progress-popup-progress-bar {
  border: 1px solid var(--color-ui-layer-light);
  border-radius: 1rem;
  height: 0.5rem;

  &::-webkit-progress-value {
    background: var(--color-accent);
    border-start-start-radius: 1rem;
    border-end-start-radius: 1rem;
  }

  &::-webkit-progress-bar {
    background: var(--color-ui-layer);
    border-radius: 1rem;
  }
}
</style>
