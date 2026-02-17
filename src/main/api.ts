import { type IpcMainInvokeEvent, ipcMain, shell } from 'electron';
import {
  LoaderInfo,
  Modpack,
  ModpackFrontendData,
  VanillaError,
} from './data/modpack';
import {
  accounts,
  getAccount,
  getModpack,
  getSettings,
  modpacks,
} from './data';
import { loader, type LoaderId } from 'tomate-loaders';
import { Account } from './data/account';
import { is } from '@electron-toolkit/utils';
import { ImplementedProvider, Version } from 'tomate-mods';
import { defaultGeneralModpackOptions, Settings } from './data/settings';
import { log } from '../common/logging/log';
import * as ModpackImporter from './data/modpack-importer';
import { mainWindow } from './windows';
import { basePath, modpacksPath } from './paths';
import { ContentType } from './data/content/content';
import { fileBufferPath } from './utils';
import {
  clearDefaultFile,
  copyScreenshot,
  deleteSkin,
  getDefaultFiles,
  getScreenshots,
  getSkins,
  getTheme,
  getThemes,
  getWorlds,
  showScreenshotInFileManager,
} from './browse';
import path from 'node:path';
import { applyDefaults } from '../common/utils';
import { FrontendError } from './error';
import { isProviderEnabled } from './data/content/lib';

const logger = log('api');

export type Router = {
  [key: string]: (event: IpcMainInvokeEvent, ...args: any[]) => void;
};

export const routes = {
  openBaseFolder() {
    shell.openPath(basePath);
  },
  // Window controls
  closeWindow() {
    mainWindow?.close();
  },
  minimizeWindow() {
    mainWindow?.minimize();
  },
  maximizeWindow() {
    mainWindow?.maximize();
  },
  restoreWindow() {
    mainWindow?.restore();
  },
  // Modpacks
  getModpackData(_e, modpackId: string) {
    return getModpack(modpackId).frontendData();
  },
  setModpackConfig(_e, modpackConfig: ModpackFrontendData) {
    const modpack = getModpack(modpackConfig.id);

    modpack.name = modpackConfig.name;
    modpack.description = modpackConfig.description;
    modpack.gameVersion = modpackConfig.gameVersion;
    modpack.modpackOptions = modpackConfig.modpackOptions;

    if (
      JSON.stringify(modpack.loader) != JSON.stringify(modpackConfig.loader)
    ) {
      modpack.loader = modpackConfig.loader;
      modpack.launchConfig = undefined;
    }

    modpacks.invalidate(modpack);
  },
  searchModpack(_e, query: string) {
    return Modpack.searchModpack(query);
  },
  deleteModpack(_e, id: string) {
    getModpack(id).delete();
  },
  openModpackFolder(_e, id: string) {
    getModpack(id).openExplorer();
  },
  createModpack(_e, name: string, version: string, loader: LoaderInfo) {
    logger.log('Created modpack', name, version, loader);
    modpacks.push(new Modpack(name, version, loader));
  },
  getModpackIcon(_e, modpackId: string) {
    return getModpack(modpackId).getIcon();
  },
  setModpackIcon(_e, modpackId: string, iconPath: string) {
    return getModpack(modpackId).setIcon(iconPath);
  },
  setModpackIconFromFile(_e, modpackId: string, buffer: ArrayBuffer) {
    return getModpack(modpackId).setIcon(fileBufferPath(buffer));
    //
  },
  setModpackIconSpecial(_e, modpackId: string, variant: 'default') {
    if (variant === 'default') {
      return getModpack(modpackId).resetIcon();
    }
  },
  setModpackIconFromUrl(_e, modpackId: string, url: string) {
    return getModpack(modpackId).setIconFromUrl(url);
  },
  async installModpack(_e, provider: ImplementedProvider, id: string) {
    if (!isProviderEnabled(provider)) {
      throw new FrontendError(`${provider} is not enabled`);
    }

    await ModpackImporter.fromResource(provider, id);
  },
  async importModpackFromFile(_e, name: string, buffer: ArrayBuffer) {
    await ModpackImporter.fromFileBuffer(name, buffer);
  },
  async launchModpack(
    _e,
    modpackId: string,
    accountId: string,
    world?: string,
  ) {
    const account = getAccount(accountId);
    const modpack = getModpack(modpackId);

    await modpack.launch(
      account,
      (world && { type: 'singleplayer', identifier: world }) || undefined,
    );
    logger.log(`Launched modpack ${modpack} with account ${account}`);
  },
  async gameVersions(_e, loaderId: LoaderId) {
    try {
      return await loader(loaderId).listSupportedGameVersions();
    } catch (e) {
      logger.warn(
        'Failed to fetch supported versions, fallback to offline support',
        e,
      );

      const cachedGameVersions = getSettings().getCachedGameVersions(loaderId);
      return cachedGameVersions.map((gameVersion) => ({
        version: gameVersion,
        stable: true,
      }));
    }
  },
  async loaderVersions(_e, loaderId: LoaderId, gameVersion: string) {
    if (loaderId == 'vanilla') {
      throw new VanillaError();
    }

    try {
      return await loader(loaderId).listLoaderVersions(gameVersion);
    } catch (e) {
      logger.warn(
        'Failed to fetch supported versions, fallback to offline support',
        e,
      );

      return getSettings()
        .getCachedLoaderVersions(loaderId, gameVersion)
        .filter((a) => a != 'undefined');
    }
  },

  // Content
  updateContentFromFiles(_e, modpackId: string, contentType: ContentType) {
    return getModpack(modpackId).content(contentType).updateFromFiles();
  },
  searchContent(
    _e,
    modpackId: string,
    contentType: ContentType,
    query: string,
  ) {
    return getModpack(modpackId).content(contentType).search(query);
  },
  contentVersions(
    _e,
    modpackId: string,
    contentType: ContentType,
    provider: ImplementedProvider,
    id: string,
  ) {
    if (!isProviderEnabled(provider)) {
      throw new FrontendError(`${provider} is not enabled`);
    }

    return getModpack(modpackId).content(contentType).versions(provider, id);
  },
  installContent(
    _e,
    modpackId: string,
    contentType: ContentType,
    provider: ImplementedProvider,
    projectId: string,
    downloadDependencies?: boolean,
  ) {
    if (!isProviderEnabled(provider)) {
      throw new FrontendError(`${provider} is not enabled`);
    }

    return getModpack(modpackId)
      .content(contentType)
      .installLatest(provider, projectId, 'local', downloadDependencies);
  },
  installContentVersion(
    _e,
    modpackId: string,
    contentType: ContentType,
    provider: ImplementedProvider,
    version: Version,
    downloadDependencies?: boolean,
  ) {
    if (!isProviderEnabled(provider)) {
      throw new FrontendError(`${provider} is not enabled`);
    }

    return getModpack(modpackId)
      .content(contentType)
      .install(provider, version, 'local', downloadDependencies);
  },
  replaceContentVersionLatest(
    _e,
    modpackId: string,
    contentType: ContentType,
    id: string,
    provider: ImplementedProvider,
    projectId: string,
    downloadDependencies?: boolean,
  ) {
    if (!isProviderEnabled(provider)) {
      throw new FrontendError(`${provider} is not enabled`);
    }

    return getModpack(modpackId)
      .content(contentType)
      .replaceLatest(provider, id, projectId, 'local', downloadDependencies);
  },
  replaceContentVersion(
    _e,
    modpackId: string,
    contentType: ContentType,
    id: string,
    provider: ImplementedProvider,
    version: Version,
    downloadDependencies?: boolean,
  ) {
    if (!isProviderEnabled(provider)) {
      throw new FrontendError(`${provider} is not enabled`);
    }

    return getModpack(modpackId)
      .content(contentType)
      .replaceVersion(provider, id, version, 'local', downloadDependencies);
  },
  importContent(
    _e,
    modpackId: string,
    contentType: ContentType,
    filename: string,
    buffer: ArrayBuffer,
  ) {
    return getModpack(modpackId)
      .content(contentType)
      .import(fileBufferPath(buffer, filename));
  },
  removeContent(_e, modpackId: string, contentType: ContentType, id: string) {
    return getModpack(modpackId).content(contentType).delete(id);
  },
  toggleContentDisabled(
    _e,
    modpackId: string,
    contentType: ContentType,
    id: string,
  ) {
    return getModpack(modpackId).content(contentType).toggleDisabled(id);
  },

  // Accounts
  async addMsaAccount(_e) {
    const settings = getSettings();
    const account = await Account.login();
    accounts.push(account);

    if (!settings.activeAccountId) {
      settings.activeAccountId = account.id;
    }
  },
  addOfflineAccount(_e, name: string) {
    const settings = getSettings();
    const account = Account.offline(name);
    accounts.push(account);

    if (!settings.activeAccountId) {
      settings.activeAccountId = account.id;
    }
  },
  addDemoAccount(_e) {
    const settings = getSettings();
    const account = Account.demo();
    accounts.push(account);

    if (!settings.activeAccountId) {
      settings.activeAccountId = account.id;
    }
  },
  removeAccount(_e, accountId: string) {
    return getAccount(accountId).delete();
  },
  setAccountCape(_e, accountId: string, id: string) {
    return getAccount(accountId).setCape(id);
  },
  setSkin(_e, accountId: string, url: string) {
    return getAccount(accountId).setSkin(url);
  },
  uploadSkin(_e, accountId: string, buffer: ArrayBuffer) {
    return getAccount(accountId).uploadSkin(buffer);
  },
  deleteSkin(_e, id: string) {
    return deleteSkin(id);
  },

  setSettingsProperty<Key extends keyof Settings>(
    _e: unknown,
    propertyName: Key,
    propertyValue: Settings[Key],
  ) {
    getSettings()[propertyName] = propertyValue;
  },
  getSettingsProperty<Key extends keyof Settings>(
    _e: unknown,
    propertyName: Key,
  ): Settings[Key] {
    return getSettings()[propertyName];
  },
  getDefaultGeneralModpackOptions() {
    return defaultGeneralModpackOptions;
  },
  getDefaulltModpackOptions() {
    return applyDefaults(
      getSettings().modpackDefaultOptions,
      defaultGeneralModpackOptions,
    );
  },
  getScreenshots,
  copyScreenshot(_e, modpack: string, screenshot: string) {
    copyScreenshot(modpack, screenshot);
  },
  showScreenshotInFileManager(_e, modpack: string, screenshot: string) {
    showScreenshotInFileManager(modpack, screenshot);
  },
  getSkins,
  getThemes,
  getTheme() {
    const theme = getSettings().theme;
    return getTheme(theme);
  },
  getWorlds,
  openWorldFolder(_e, modpack: string, id: string) {
    shell.showItemInFolder(
      path.join(modpacksPath, modpack, 'saves', id, 'level.dat'),
    );
  },
  getDefaultFiles,
  applyDefaultFile(_e, modpackId: string, file: string) {
    return getModpack(modpackId).createDefault(file);
  },
  clearDefaultFile(_e, file: string) {
    return clearDefaultFile(file);
  },
} satisfies Router;

export function invoke(route: string, ...args: unknown[]) {
  if (
    !mainWindow ||
    mainWindow.isDestroyed() ||
    !mainWindow.webContents ||
    mainWindow.webContents.isDestroyed()
  )
    return;

  return mainWindow.webContents.send(route, ...args);
}

Object.keys(routes).forEach((key) => {
  ipcMain.handle(key, async (...args: any) => {
    if (is.dev) {
      const [, ...interestingArgs] = args;
      logger.verbose('Requested route', key, '(', ...interestingArgs, ')');
    }

    try {
      return await routes[key](...args);
    } catch (e) {
      return {
        __error: true,
        __isFrontendError: e instanceof FrontendError,
        __message:
          typeof e === 'object' && e && 'message' in e ? e.message : null,
        __name: typeof e === 'object' && e && 'name' in e ? e.name : null,
      };
    }
  });
});
