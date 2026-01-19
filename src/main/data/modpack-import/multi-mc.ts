import { LoaderInfo, ModpackImporter, ProgressListener } from '.';
import ConfigParser from 'configparser';

import fs from 'node:fs';
import path from 'node:path';
import { Modpack } from '../modpack';

type Component = {
  uid: string;
  important?: boolean;
  version?: string;
  cachedName?: string;
  cachedVersion?: string;
};

type MMC = {
  formatVersion: 1;
  components: Component[];
};

export class MultiMc implements ModpackImporter {
  instance: ConfigParser;
  mmc: MMC;

  constructor(public filePath: string) {
    this.instance = new ConfigParser();
    this.instance.read(path.join(filePath, 'instance.cfg'));
    this.mmc = JSON.parse(
      fs.readFileSync(path.join(filePath, 'mmc-pack.json'), 'utf8'),
    );
  }

  join(file: string) {
    return path.join(this.filePath, file);
  }

  get name(): string {
    return this.instance.get('General', 'name')!;
  }

  get overrides() {
    return this.join('.minecraft');
  }

  get minecraftVersion(): string {
    return this.mmc.components.find(
      (component) => component.uid === 'net.minecraft',
    )!.version!;
  }
  get loader(): LoaderInfo {
    const loaders = [
      { uid: 'net.neoforged', id: 'neoforge' },
      { uid: 'net.minecraftforge', id: 'forge' },
      { uid: 'net.fabricmc.fabric-loader', id: 'fabric' },
      { uid: 'org.quiltmc.quilt-loader', id: 'quilt' },
    ] as const;

    for (const loader of loaders) {
      const component = this.mmc.components.find(
        (component) => component.uid === loader.uid,
      );

      if (component) {
        return {
          id: loader.id,
          version: (component.version ?? component.cachedVersion) as string,
        };
      }
    }

    return {
      id: 'vanilla',
      version: this.minecraftVersion,
    };
  }

  async downloadFiles(
    _modpack: Modpack,
    _onProgress: ProgressListener,
  ): Promise<void> {}

  async overrideAdditionalFiles(directory: string): Promise<void> {
    const icon = this.instance.get('General', 'iconKey');

    const iconPath = this.join(icon + '.png');

    if (icon && fs.existsSync(iconPath)) {
      fs.copyFileSync(iconPath, path.join(directory, 'icon.png'));
    }
  }
}
