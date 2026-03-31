import { ipcMain, shell } from 'electron';
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
  getTokens,
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
import { basePath } from './paths';
import { ContentType } from './data/content/content';
import { fileBufferPath } from './utils';
import {
  clearDefaultFile,
  copyScreenshot,
  deleteSkin,
  getDefaultFiles,
  getScreenshots,
  getServers,
  getSkins,
  getTheme,
  getThemes,
  getWorlds,
  pingServer,
  showScreenshotInFileManager,
} from './browse';
import path from 'node:path';
import { applyDefaults } from '../common/utils';
import { FrontendError, ProviderError } from './error';
import { LaunchOptions } from 'tomate-launcher-core';
import { tomateMods } from './data/content/lib';

const logger = log('api');

export type Router = {
  [key: string]: (...args: any[]) => void;
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
  getModpackData(modpackId: string) {
    return getModpack(modpackId).frontendData();
  },
  setModpackConfig(modpackConfig: ModpackFrontendData) {
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
  searchModpack(query: string) {
    return Modpack.searchModpack(query);
  },
  deleteModpack(id: string) {
    getModpack(id).delete();
  },
  openModpackFolder(id: string) {
    getModpack(id).openExplorer();
  },
  createModpack(name: string, version: string, loader: LoaderInfo) {
    logger.log('Created modpack', name, version, loader);
    modpacks.push(new Modpack(name, version, loader));
  },
  getModpackIcon(modpackId: string) {
    return getModpack(modpackId).getIcon();
  },
  setModpackIcon(modpackId: string, iconPath: string) {
    return getModpack(modpackId).setIcon(iconPath);
  },
  setModpackIconFromFile(modpackId: string, buffer: ArrayBuffer) {
    return getModpack(modpackId).setIcon(fileBufferPath(buffer));
    //
  },
  setModpackIconSpecial(modpackId: string, variant: 'default') {
    if (variant === 'default') {
      return getModpack(modpackId).resetIcon();
    }
  },
  setModpackIconFromUrl(modpackId: string, url: string) {
    return getModpack(modpackId).setIconFromUrl(url);
  },
  async installModpack(provider: ImplementedProvider, id: string) {
    if (!tomateMods.hasProvider(provider)) {
      throw new ProviderError(provider);
    }

    await ModpackImporter.fromResource(provider, id);
  },
  async importModpackFromFile(name: string, buffer: ArrayBuffer) {
    await ModpackImporter.fromFileBuffer(name, buffer);
  },
  async launchModpack(
    modpackId: string,
    accountId: string,
    quickPlay?: LaunchOptions['quickPlay'],
  ) {
    const account = getAccount(accountId);
    const modpack = getModpack(modpackId);

    await modpack.launch(account, quickPlay);
    logger.log(`Launched modpack ${modpack} with account ${account}`);
  },
  async gameVersions(loaderId: LoaderId) {
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
  async loaderVersions(loaderId: LoaderId, gameVersion: string) {
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
  updateContentFromFiles(modpackId: string, contentType: ContentType) {
    return getModpack(modpackId).content(contentType).updateFromFiles();
  },
  searchContent(modpackId: string, contentType: ContentType, query: string) {
    return getModpack(modpackId).content(contentType).search(query);
  },
  contentVersions(
    modpackId: string,
    contentType: ContentType,
    provider: ImplementedProvider,
    id: string,
  ) {
    if (!tomateMods.hasProvider(provider)) {
      throw new FrontendError(`${provider} is not enabled`);
    }

    return getModpack(modpackId).content(contentType).versions(provider, id);
  },
  installContent(
    modpackId: string,
    contentType: ContentType,
    provider: ImplementedProvider,
    projectId: string,
    downloadDependencies?: boolean,
  ) {
    if (!tomateMods.hasProvider(provider)) {
      throw new FrontendError(`${provider} is not enabled`);
    }

    return getModpack(modpackId)
      .content(contentType)
      .installLatest(provider, projectId, 'local', downloadDependencies);
  },
  installContentVersion(
    modpackId: string,
    contentType: ContentType,
    provider: ImplementedProvider,
    version: Version,
    downloadDependencies?: boolean,
  ) {
    if (!tomateMods.hasProvider(provider)) {
      throw new FrontendError(`${provider} is not enabled`);
    }

    return getModpack(modpackId)
      .content(contentType)
      .install(provider, version, 'local', downloadDependencies);
  },
  replaceContentVersionLatest(
    modpackId: string,
    contentType: ContentType,
    id: string,
    provider: ImplementedProvider,
    projectId: string,
    downloadDependencies?: boolean,
  ) {
    if (!tomateMods.hasProvider(provider)) {
      throw new FrontendError(`${provider} is not enabled`);
    }

    return getModpack(modpackId)
      .content(contentType)
      .replaceLatest(provider, id, projectId, 'local', downloadDependencies);
  },
  replaceContentVersion(
    modpackId: string,
    contentType: ContentType,
    id: string,
    provider: ImplementedProvider,
    version: Version,
    downloadDependencies?: boolean,
  ) {
    if (!tomateMods.hasProvider(provider)) {
      throw new FrontendError(`${provider} is not enabled`);
    }

    return getModpack(modpackId)
      .content(contentType)
      .replaceVersion(provider, id, version, 'local', downloadDependencies);
  },
  importContent(
    modpackId: string,
    contentType: ContentType,
    filename: string,
    buffer: ArrayBuffer,
  ) {
    return getModpack(modpackId)
      .content(contentType)
      .import(fileBufferPath(buffer, filename));
  },
  removeContent(modpackId: string, contentType: ContentType, id: string) {
    return getModpack(modpackId).content(contentType).delete(id);
  },
  toggleContentDisabled(
    modpackId: string,
    contentType: ContentType,
    id: string,
  ) {
    return getModpack(modpackId).content(contentType).toggleDisabled(id);
  },

  // Accounts
  async addMsaAccount() {
    const settings = getSettings();
    const account = await Account.login();
    accounts.push(account);

    if (!settings.activeAccountId) {
      settings.activeAccountId = account.id;
    }
  },
  addOfflineAccount(name: string) {
    const settings = getSettings();
    const account = Account.offline(name);
    accounts.push(account);

    if (!settings.activeAccountId) {
      settings.activeAccountId = account.id;
    }
  },
  addDemoAccount() {
    const settings = getSettings();
    const account = Account.demo();
    accounts.push(account);

    if (!settings.activeAccountId) {
      settings.activeAccountId = account.id;
    }
  },
  removeAccount(accountId: string) {
    return getAccount(accountId).delete();
  },
  setAccountCape(accountId: string, id: string) {
    return getAccount(accountId).setCape(id);
  },
  setSkin(accountId: string, url: string) {
    return getAccount(accountId).setSkin(url);
  },
  uploadSkin(accountId: string, buffer: ArrayBuffer) {
    return getAccount(accountId).uploadSkin(buffer);
  },
  deleteSkin,

  setSettingsProperty<Key extends keyof Settings>(
    propertyName: Key,
    propertyValue: Settings[Key],
  ) {
    getSettings()[propertyName] = propertyValue;
  },
  getSettingsProperty<Key extends keyof Settings>(
    propertyName: Key,
  ): Settings[Key] {
    return getSettings()[propertyName];
  },
  setCurseforgeToken(token: string) {
    return getTokens().setCurseforgeToken(token);
  },
  getTokens() {
    return getTokens().frontendData();
  },
  getDefaultGeneralModpackOptions() {
    return defaultGeneralModpackOptions;
  },
  getDefaultModpackOptions() {
    return applyDefaults(
      getSettings().modpackDefaultOptions,
      defaultGeneralModpackOptions,
    );
  },
  getScreenshots,
  copyScreenshot,
  showScreenshotInFileManager,
  getSkins,
  getThemes,
  getTheme() {
    const theme = getSettings().theme;
    return getTheme(theme);
  },
  getWorlds,
  openWorldFolder(modpackId: string, id: string) {
    shell.showItemInFolder(
      path.join(getModpack(modpackId).dir, 'saves', id, 'level.dat'),
    );
  },
  getServers,
  pingServer,
  getDefaultFiles,
  applyDefaultFile(modpackId: string, file: string) {
    return getModpack(modpackId).createDefault(file);
  },
  clearDefaultFile,
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
  ipcMain.handle(key, async (_e, ...args: any) => {
    if (is.dev) {
      logger.verbose('Requested route', key, '(', ...args, ')');
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
