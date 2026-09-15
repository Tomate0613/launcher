import type { ElectronAPI } from '@electron-toolkit/preload';
import type { LogLevel } from '../common/logging/log.js';
import type { Routes, RouteArgs, RouteReturn } from './types.ts';

type Platform =
  | 'aix'
  | 'android'
  | 'darwin'
  | 'freebsd'
  | 'haiku'
  | 'linux'
  | 'openbsd'
  | 'sunos'
  | 'win32'
  | 'cygwin'
  | 'netbsd';

type ProcessVersions = {
  [key: string]: string | undefined;

  readonly electron: string;
  readonly chrome: string;

  readonly http_parser: string;
  readonly node: string;
  readonly v8: string;
  readonly ares: string;
  readonly uv: string;
  readonly zlib: string;
  readonly modules: string;
  readonly openssl: string;
};

declare global {
  interface Window {
    readonly api: {
      invoke<Key extends keyof Routes>(
        route: Key,
        ...args: RouteArgs<Routes[Key]>
      ): RouteReturn<Routes[Key]>;
      readonly on: ElectronAPI['ipcRenderer']['on'];
      readonly versions: ProcessVersions;
      readonly platform: Platform;
      readonly runtimeEnvironment: "native" | "flatpak" | "appimage";
    };

    readonly log: (
      level: LogLevel,
      channel: string,
      thread: string,
      data: unknown[],
    ) => Promise<void>;
  }
}
