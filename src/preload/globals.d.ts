import type { ElectronAPI } from '@electron-toolkit/preload';
import type { Settings } from '../main/data/settings.js';
import type { LogLevel } from '../common/logging/log.js';
import type { Routes, RouteArgs, RouteReturn } from './types.ts';

declare global {
  interface Window {
    api: {
      invoke<Key extends keyof Routes>(
        route: Key,
        ...args: RouteArgs<Routes[Key]>
      ): RouteReturn<Routes[Key]>;
      on: ElectronAPI['ipcRenderer']['on'];
      versions: ElectronAPI['process']['versions'];
      settings: {
        getProperty<Key extends keyof Settings>(
          key: Key,
        ): Promise<Settings[Key]>;
        setProperty<Key extends keyof Settings>(
          key: Key,
          value: Settings[Key],
        ): Promise<void>;
      };
    };

    log: (
      level: LogLevel,
      channel: string,
      thread: string,
      data: unknown[],
    ) => Promise<void>;
  }
}
