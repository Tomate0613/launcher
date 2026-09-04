import fs from 'node:fs/promises';
import type { LoaderId } from "tomate-loaders";
import { Serializable, SerializableProperty } from "./serialization";
import type { Modpack } from "./modpack";
import { statePath } from "../paths";

export class State extends Serializable {
  @SerializableProperty
  private cachedLaunchConfigs: Record<
    `${LoaderId}:${string}`,
    Modpack['launchConfig']
  > = {};
  @SerializableProperty
  storeGcLastRunDate = Date.now();

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
    const all = Object.keys(this.cachedLaunchConfigs)
      .filter((config) => config.startsWith(`${loaderId}:`))
      .map((config) => config.split(':')[2]);

    // Filter out duplicates, we can replace this with something more pretty in the future if necessary
    return all.filter((a, i) => !all.some((b, d) => a == b && i > d));
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
    return fs.writeFile(statePath, JSON.stringify(this));
  }

  static async load() {
    try {
      return State.fromJSON(await fs.readFile(statePath, 'utf8'), State);
    } catch {
      return new State();
    }
  }
}
