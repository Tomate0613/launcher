import { EnabledProvider, isProviderEnabled, tomateMods } from './content/lib';
import { Modpack } from './modpack';
import path from 'node:path';
import { modpacks } from '../data';
import { tempPaths } from '../paths';
import { randomUUID } from 'node:crypto';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';
import { log } from '../../common/logging/log';
import { Mrpack } from './modpack-import/mrpack';
import { MultiMc } from './modpack-import/multi-mc';
import { ModpackImporter } from './modpack-import';
import { Cursepack } from './modpack-import/cursepack';
import { fileBufferPath } from '../utils';
import { error, FrontendError } from '../error';

const logger = log('modpack-import');

export async function fromFileBuffer(name: string, buffer: ArrayBuffer) {
  return fromFile(fileBufferPath(buffer, name));
}

export async function fromFile(file: string, modpack?: Modpack) {
  logger.log('Importing file', file);

  const importer = await getHandler(file);

  if (!modpack) {
    modpack = new Modpack(
      importer.name,
      importer.minecraftVersion,
      importer.loader,
    );

    modpacks.push(modpack);
  } else {
    modpack.gameVersion = importer.minecraftVersion;
    modpack.loader = importer.loader;
  }

  const ctx = modpack.process('import', () => {
    modpack.delete();
  });

  try {
    logger.log('Copying overrides');
    if (importer.overrides && fs.existsSync(importer.overrides)) {
      fs.rmSync(modpack.dir, { recursive: true });
      fs.cpSync(importer.overrides, modpack.dir, { recursive: true });
      modpack.symlinks();
      modpack.setupContentDirectories();
    }

    logger.log('Override additional files');
    await importer.overrideAdditionalFiles(modpack.dir);

    logger.log('Downloading files');
    await importer.downloadFiles(modpack, (progress) => {
      ctx.progress(progress);
    });
  } catch (e) {
    ctx.cancel();
    throw error('Failed to import modpack', e);
  } finally {
    ctx.stop();
  }
  return modpack;
}

async function extractToTempPath(filePath: string) {
  logger.log('Extracting file');

  const tempPath = path.join(tempPaths, randomUUID());

  const zip = new AdmZip(filePath);
  zip.extractAllTo(tempPath, true);

  return tempPath;
}

async function getHandler(filePath: string): Promise<ModpackImporter> {
  let fileStat = fs.statSync(filePath);

  if (
    fileStat.isFile() &&
    (filePath.endsWith('.zip') || filePath.endsWith('.mrpack'))
  ) {
    filePath = await extractToTempPath(filePath);
    fileStat = fs.statSync(filePath);
  }

  if (!fileStat.isDirectory()) {
    throw new Error('Failed to import modpack. Unsupported file type');
  }

  if (fs.existsSync(path.join(filePath, 'instance.cfg'))) {
    return new MultiMc(filePath);
  }

  if (fs.existsSync(path.join(filePath, 'modrinth.index.json'))) {
    return new Mrpack(filePath);
  }

  if (fs.existsSync(path.join(filePath, 'manifest.json'))) {
    if (!isProviderEnabled('curseforge')) {
      throw new FrontendError('Curseforge support not enabled');
    }

    return new Cursepack(filePath);
  }

  throw new FrontendError('Unsupported modpack type');
}

export async function fromResource(
  provider: EnabledProvider,
  projectId: string,
) {
  const project = await tomateMods.provider(provider).project(projectId);
  const [version] =
    (await tomateMods.provider(provider).versions(projectId, '')) ?? [];

  if (!version) {
    throw new Error('Nuh uh!');
  }

  logger.log('Found version');

  const modpack = new Modpack(project.name, version.gameVersions[0], {
    id: 'vanilla',
  });

  if (project.icon) {
    try {
      await modpack.setIconFromUrl(project.icon);
    } catch (e) {
      logger.warn('Failed to download icon', e);
    }
  }

  modpacks.push(modpack);

  const tempPath = path.join(tempPaths, randomUUID());
  fs.mkdirSync(tempPath, { recursive: true });

  logger.log('Downloading modpack');
  const tmpDownloadPath = path.join(tempPath, 'modpack.zip');

  const ctx = modpack.process('download', () => {
    modpack.delete();

    try {
      fs.unlinkSync(tmpDownloadPath);
    } catch (e) {
      logger.error('Failed to download modpack.zip', e);
    }
  });

  try {
    await tomateMods.provider(provider).download(version, tmpDownloadPath, {
      onProgress(progress) {
        ctx.progress(progress);
      },
      minProgressSize: 1,
    });
  } catch (e) {
    ctx.cancel();
    throw error('Failed to download modpack', e);
  } finally {
    ctx.stop();
  }
  logger.log('Downloaded');

  // TODO Do not delete icon.png
  await fromFile(path.join(tempPath, 'modpack.zip'), modpack);

  modpack.name = project.name;
  modpack.description = project.description;
  project.icon && modpack.downloadIcon(project.icon);

  modpack.source = 'origin';
  modpack.resource = {
    id: project.id,
    provider,
    version: version.id.toString(),
  };

  return modpack;
}
