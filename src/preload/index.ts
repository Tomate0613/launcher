import { contextBridge } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import type { LogLevel } from '../common/logging/log';

try {
  contextBridge.exposeInMainWorld('api', {
    async invoke(route: string, ...args: unknown[]) {
      const ret = await electronAPI.ipcRenderer.invoke(route, ...args);

      if (typeof ret === 'object' && ret && '__error' in ret) {
        if (ret['__isFrontendError']) {
          window.postMessage({
            type: 'frontend-error',
            name: ret['__name'],
            message: ret['__message'],
          });
        }

        throw new Error(ret['__message']);
      }

      return ret;
    },
    on: electronAPI.ipcRenderer.on,
    versions: electronAPI.process.versions,
    settings: {
      getProperty(key: string) {
        return electronAPI.ipcRenderer.invoke('getSettingsProperty', key);
      },
      setProperty(key: string, value: unknown) {
        return electronAPI.ipcRenderer.invoke(
          'setSettingsProperty',
          key,
          value,
        );
      },
    },
  });

  contextBridge.exposeInMainWorld(
    'log',
    async (
      level: LogLevel,
      channel: string,
      thread: string,
      data: undefined[],
    ) => {
      return await electronAPI.ipcRenderer.invoke(
        'log',
        level,
        channel,
        thread,
        data,
      );
    },
  );

  electronAPI.ipcRenderer.on('show-error', (_e, error) => {
    window.postMessage({
      type: 'frontend-error',
      name: error.name,
      message: error.message,
    });
  });
} catch (error) {
  console.error(error);
}
