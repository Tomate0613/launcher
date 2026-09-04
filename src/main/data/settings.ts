import { basePath, settingsPath } from '../paths';
import { Serializable, SerializableProperty } from './serialization';
import fs from 'node:fs/promises';

const frontendKeys = [
  'activeAccountId',
  'modpackDefaultOptions',
  'theme',
  'hideFrame',
  'wrapper',
  'store',
  'disabledTabs',
] as const;

export type SettingsFrontendData = {
  [K in (typeof frontendKeys)[number]]: Settings[K];
};

export type GeneralModpackOptions = {
  minRam: number;
  maxRam: number;
  stashLastLaunchEnabled: boolean;
  stashComplete: boolean;
  customLaunchArgs: string[];
  customJvmArgs: string[];
};

export type WrapperOptions = {
  enabled: boolean;
  reopen: boolean;
  autoClose: boolean;
  sandbox: boolean;
};

export type StoreOptions = {
  gcSchedule: 'on-close' | 'weekly';
};

export const defaultGeneralModpackOptions: GeneralModpackOptions = {
  minRam: 2500,
  maxRam: 5000,

  stashLastLaunchEnabled: true,
  stashComplete: false,

  customLaunchArgs: [],
  customJvmArgs: [],
};

export class Settings extends Serializable {
  __version = '4';
  @SerializableProperty
  activeAccountId?: string;
  @SerializableProperty
  modpackDefaultOptions: Partial<GeneralModpackOptions> = {};
  @SerializableProperty
  theme: string = 'default';
  @SerializableProperty
  hideFrame: boolean = false;
  @SerializableProperty
  wrapper: WrapperOptions = {
    enabled: true,
    reopen: true,
    autoClose: false,
    sandbox: false,
  };
  @SerializableProperty
  store: StoreOptions = {
    gcSchedule: 'weekly',
  };
  @SerializableProperty
  disabledTabs: string[] = ['news'];

  _constructor(version: string): void {
    switch (version) {
      case '1':
        this.wrapper = {
          enabled: true,
          reopen: true,
          autoClose: false,
          sandbox: false,
        };
      case '2':
        this.store = { gcSchedule: 'weekly' };
      case '3':
        this.disabledTabs = ['news'];
        this.wrapper.sandbox = false;
    }

    this.__version = '4';
  }

  getModpackDefaultOption<Key extends keyof GeneralModpackOptions>(key: Key) {
    return this.modpackDefaultOptions[key] ?? defaultGeneralModpackOptions[key];
  }

  save() {
    return fs.writeFile(settingsPath, JSON.stringify(this));
  }

  frontendData(): SettingsFrontendData {
    const result = {} as SettingsFrontendData;

    for (const key of frontendKeys) {
      result[key] = this[key] as never;
    }

    return result;
  }

  static async load() {
    try {
      return Settings.fromJSON(await fs.readFile(settingsPath, 'utf8'), Settings);
    } catch {
      return new Settings();
    }
  }
}
