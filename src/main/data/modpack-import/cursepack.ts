import { LoaderInfo, ModpackImporter, ProgressListener } from '.';

import fs from 'node:fs';
import path from 'node:path';
import { isProviderEnabled, tomateMods } from '../content/lib';
import { log } from '../../../common/logging/log';
import { Modpack } from '../modpack';

const logger = log('cursepack');

type Manifest = {
  minecraft: {
    version: string;
    modLoaders: {
      id: string;
      primary: boolean;
    }[];
  };
  manifestType: 'minecraftModpack';
  manifestVersion: number;
  name: string;
  version: string;
  author: string;
  files: {
    projectID: number;
    fileID: number;
    required: boolean;
  }[];
  overrides: string;
};

export class Cursepack implements ModpackImporter {
  manifest: Manifest;

  constructor(public filePath: string) {
    this.manifest = JSON.parse(
      fs.readFileSync(path.join(filePath, 'manifest.json'), 'utf8'),
    );
  }

  join(file: string) {
    return path.join(this.filePath, file);
  }

  get name(): string {
    return this.manifest.name;
  }

  get overrides() {
    return this.join(this.manifest.overrides);
  }

  get minecraftVersion(): string {
    return this.manifest.minecraft.version;
  }

  get loader(): LoaderInfo {
    const loader = this.manifest.minecraft.modLoaders.find(
      (loader) => loader.primary,
    );

    if (!loader) {
      return {
        id: 'vanilla',
        version: this.minecraftVersion,
      };
    }

    const [id, version] = loader.id.split('-');

    return {
      id: id as never,
      version,
    };
  }

  async downloadFiles(
    modpack: Modpack,
    onProgress: ProgressListener,
  ): Promise<void> {
    const curseforge = 'curseforge' as const;

    if (!isProviderEnabled(curseforge)) {
      throw new Error('Curseforge disabled');
    }

    let downloadedFiles = 0;
    await Promise.allSettled(
      this.manifest.files.map(async (file) => {
        const cf = tomateMods.provider(curseforge);
        const version = await cf.version(
          file.projectID.toString(),
          file.fileID.toString(),
        );
        const project = await cf.project(file.projectID.toString());

        await modpack
          .content(project.type || 'other')
          .install(curseforge, version, 'origin');

        downloadedFiles += 1;
        onProgress(downloadedFiles / this.manifest.files.length);
      }),
    );

    logger.log('Downloaded all mods!');
  }

  async overrideAdditionalFiles(_directory: string): Promise<void> {}
}
