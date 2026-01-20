import path from 'node:path';
import { is } from '@electron-toolkit/utils';
import { ensureDirectoryExists } from './utils';

function getBaseDataPath() {
  if (process.env.XDG_DATA_HOME) {
    return process.env.XDG_DATA_HOME;
  }

  if (process.env.APPDATA) {
    return process.env.APPDATA;
  }

  if (process.env.HOME) {
    return path.join(
      process.env.HOME,
      process.platform === 'darwin'
        ? 'Library/Application Support'
        : '.local/share',
    );
  }

  throw new Error('No suitable data directory found');
}

const appData = getBaseDataPath();

export const basePath = path.join(
  appData,
  is.dev ? 'tomate-launcher-dev' : 'tomate-launcher',
);

export const modpacksPath = path.join(basePath, 'modpacks/');
export const logsPath = path.join(basePath, 'logs/');
export const storePath = path.join(basePath, 'store/');
export const stashesPath = path.join(basePath, 'stash/');
export const tempPaths = path.join(basePath, 'temp/');
export const minecraftRootPath = path.join(basePath, 'minecraft/');
export const minecraftLibrariesPath = path.join(
  minecraftRootPath,
  'libraries/',
);
export const minecraftAssetRootPath = path.join(minecraftRootPath, 'assets/');
export const minecraftVersionDirectoryPath = path.join(
  minecraftRootPath,
  'versions/',
);
export const javaInstallationsPath = path.join(basePath, 'java/');
export const skinCachePath = path.join(basePath, 'skin-cache/');
export const downloadPath = path.join(basePath, 'java/');
export const defaultsPath = path.join(basePath, 'defaults/');
export const themesPath = path.join(basePath, 'themes/');
export const accountsPath = path.join(basePath, 'accounts.json');
export const settingsPath = path.join(basePath, 'settings.json');
export const log4jConfigPath = path.join(basePath, 'log4j.xml');

export function ensureAppDirectoriesExist() {
  ensureDirectoryExists(modpacksPath);
  ensureDirectoryExists(storePath);
  ensureDirectoryExists(logsPath);
  ensureDirectoryExists(tempPaths);
  ensureDirectoryExists(minecraftRootPath);
  ensureDirectoryExists(minecraftLibrariesPath);
  ensureDirectoryExists(minecraftAssetRootPath);
  ensureDirectoryExists(minecraftVersionDirectoryPath);
  ensureDirectoryExists(downloadPath);
  ensureDirectoryExists(defaultsPath);
  ensureDirectoryExists(themesPath);
  ensureDirectoryExists(skinCachePath);
  ensureDirectoryExists(javaInstallationsPath);
}
