import { LoaderId } from 'tomate-loaders';
import { basePath, settingsPath } from '../paths';
import { Serializable, SerializableProperty } from './serialization';
import fs from 'fs';
import { Modpack } from './modpack';

export type GeneralModpackOptions = {
  minRam: number;
  maxRam: number;
  stashLastLaunchEnabled: boolean;
  stashComplete: boolean;
  customLaunchArgs: string[];
};

export const defaultGeneralModpackOptions: GeneralModpackOptions = {
  minRam: 2500,
  maxRam: 5000,

  stashLastLaunchEnabled: true,
  stashComplete: false,

  customLaunchArgs: [],
};

export class Settings extends Serializable {
  __version = '1';
  @SerializableProperty
  activeAccountId?: string;
  @SerializableProperty
  private cachedLaunchConfigs: Record<
    `${LoaderId}:${string}`,
    Modpack['launchConfig']
  > = {};
  @SerializableProperty
  modpackDefaultOptions: Partial<GeneralModpackOptions> = {};
  @SerializableProperty
  theme: string = 'default';
  @SerializableProperty
  transparentWindow: boolean = false;
  @SerializableProperty
  hideFrame: boolean = false;

  getModpackDefaultOption<Key extends keyof GeneralModpackOptions>(key: Key) {
    return this.modpackDefaultOptions[key] ?? defaultGeneralModpackOptions[key];
  }

  cacheLaunchConfig(
    loaderId: LoaderId,
    // TODO Do not store loader versions as undefined (latest)
    loaderVersion: string | undefined,
    gameVersion: string,
    config: Exclude<Modpack['launchConfig'], undefined>,
  ) {
    this.cachedLaunchConfigs[`${loaderId}:${loaderVersion}:${gameVersion}`] =
      config;
  }

  getCachedLaunchConfig(
    loaderId: LoaderId,
    loaderVersion: string | undefined,
    gameVersion: string,
  ) {
    return this.cachedLaunchConfigs[
      `${loaderId}:${loaderVersion}:${gameVersion}`
    ];
  }

  getCachedGameVersions(loaderId: LoaderId) {
    return Object.keys(this.cachedLaunchConfigs)
      .filter((config) => config.startsWith(`${loaderId}:`))
      .map((config) => config.split(':')[2]);
  }

  getCachedLoaderVersions(loaderId: LoaderId, gameVersion: string) {
    return Object.keys(this.cachedLaunchConfigs)
      .filter(
        (config) =>
          config.startsWith(`${loaderId}:`) &&
          config.endsWith(`:${gameVersion}`),
      )
      .map((config) => config.split(':')[1]);
  }

  save() {
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }

    fs.writeFileSync(settingsPath, JSON.stringify(this));
  }

  static load() {
    if (fs.existsSync(settingsPath)) {
      return Settings.fromJSON(fs.readFileSync(settingsPath, 'utf8'), Settings);
    } else {
      return new Settings();
    }
  }
}
