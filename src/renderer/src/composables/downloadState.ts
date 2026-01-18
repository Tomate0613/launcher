import { createGlobalState } from '@vueuse/core';
import type {
  DownloadStatusPayload,
  EndDownloadPayload,
  StartDownloadPayload,
} from 'tomate-launcher-core';
import { ref } from 'vue';

export type Download = {
  name: string;
  type: string;
  progress: number;
};

export const useDownloadState = createGlobalState(async () => {
  function cleanup() {
    cleanupStart();
    cleanupStatus();
    cleanupEnd();
  }

  window.addEventListener(
    'beforeunload',
    () => {
      cleanup();
    },
    { once: true },
  );

  // if (import.meta.hot) {
  //   window.addEventListener(
  //     'vite:beforeUpdate',
  //     () => {
  //       cleanup();
  //     },
  //     { once: true },
  //   );
  // }

  const downloads = ref(new Map<string, Download>());

  const cleanupStart = window.api.on(
    'start-download',
    (_event, payload: StartDownloadPayload) => {
      downloads.value.set(payload.path, {
        name: payload.name,
        type: payload.type,
        progress: 0,
      });
    },
  );

  const cleanupStatus = window.api.on(
    'download-status',
    (_event, payload: DownloadStatusPayload) => {
      const download = downloads.value.get(payload.path);
      if (download) {
        download.progress = payload.progress;
      }
    },
  );

  const cleanupEnd = window.api.on(
    'end-download',
    (_event, payload: EndDownloadPayload) => {
      downloads.value.delete(payload.path);
    },
  );

  return downloads;
});
