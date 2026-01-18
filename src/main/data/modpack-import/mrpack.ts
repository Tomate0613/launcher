import path from 'path';
import { LoaderInfo, ModpackImporter, ProgressListener } from '.';
import fs from 'fs';
import {
  downloadFileFromUrl,
  ensureDirectoryExists,
  safeJoin,
} from '../../utils';
import { log } from '../../../common/logging/log';
import { Modpack } from '../modpack';

const logger = log('mrpack-importer');

type Hashes = {
  sha1: string;
  sha512: string;
};

type Env = {
  server: string;
  client: string;
};

type File = {
  path: string;
  hashes: Hashes;
  env: Env;
  downloads: string[];
  fileSize: number;
};

type Dependencies = {
  [dependency: string]: string;
};

type ModrinthIndexMetadataRoot = {
  formatVersion: number;
  game: string;
  versionId: string;
  name: string;
  files: File[];
  dependencies: Dependencies;
};

export class Mrpack implements ModpackImporter {
  index: ModrinthIndexMetadataRoot;

  constructor(public filePath: string) {
    this.index = JSON.parse(
      fs.readFileSync(this.join('modrinth.index.json'), 'utf8'),
    ) as ModrinthIndexMetadataRoot;

    if (this.index.game !== 'minecraft') {
      throw new Error('Unsupported game');
    }
  }

  join(file: string) {
    return path.join(this.filePath, file);
  }

  get name() {
    return this.index.name;
  }

  get minecraftVersion() {
    return this.index.dependencies.minecraft;
  }

  get overrides() {
    return this.join('overrides');
  }

  get loader(): LoaderInfo {
    const loaders = ['fabric', 'quilt', 'forge', 'neoforge'] as const;

    for (const loader of loaders) {
      const qn = `${loader}-loader`;

      if (this.index.dependencies[qn]) {
        return { id: loader, version: this.index.dependencies[qn] };
      }

      if (this.index.dependencies[loader]) {
        return { id: loader, version: this.index.dependencies[loader] };
      }
    }

    throw new Error(
      'Could not find out loader ' + JSON.stringify(this.index.dependencies),
    );
  }

  get version() {
    return this.index.versionId;
  }

  async downloadFiles(
    modpack: Modpack,
    onProgress: ProgressListener,
  ): Promise<void> {
    let downloadedFiles = 0;
    await Promise.allSettled(
      this.index.files.map(async (file) => {
        let downloaded = false;

        for (const downloadUrl of file.downloads) {
          const filePath = safeJoin(modpack.dir, file.path);

          try {
            ensureDirectoryExists(path.dirname(filePath));
            await downloadFileFromUrl(downloadUrl, filePath, file.hashes.sha1);
            downloaded = true;
            break; // Stop trying further URLs for this file
          } catch (error) {
            // Try the next URL
          }
        }

        if (!downloaded) {
          logger.error(
            `Failed to download ${file.path}. No working download URL.`,
          );
        }

        downloadedFiles += 1;
        onProgress(downloadedFiles / this.index.files.length);
      }),
    );

    logger.log('Downloaded all mods!');
  }

  async overrideAdditionalFiles(_directory: string): Promise<void> {}
}
