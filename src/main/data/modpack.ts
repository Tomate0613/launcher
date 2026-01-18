import paths from 'path';
import {
  defaultsPath,
  javaInstallationsPath,
  log4jConfigPath,
  minecraftAssetRootPath,
  minecraftLibrariesPath,
  minecraftRootPath,
  minecraftVersionDirectoryPath,
  modpacksPath,
  stashesPath,
} from '../paths';
import { Serializable, SerializableProperty } from './serialization';
import TomateLoaders, { type LoaderId, ModdedLoaderId } from 'tomate-loaders';
import { randomUUID } from 'crypto';
import TLC, { isMinecraftVersionAfter } from 'tomate-launcher-core';
import { findJavaInstallations } from '@doublekekse/find-java';
import fs from 'fs-extra';
import {
  type Provider,
  ImplementedProvider,
  ProjectType,
  SearchResult,
} from 'tomate-mods';
import { Account } from './account';
import { invoke } from '../api';
import { getSettings, modpacks } from '../data';
import {
  downloadFileFromUrl,
  ensureDirectoryExists,
  imageSync,
  noop,
} from '../utils';
import { log, type Logger } from '../../common/logging/log';
import { shell } from 'electron';
import { ModsContent } from './content/mods';
import { GeneralModpackOptions } from './settings';
import { enabledProviders, tomateMods } from './content/lib';
import { ContentType, ResourceSource } from './content/content';
import { ShaderpacksContent } from './content/shaderpacks';
import { ResourcepacksContent } from './content/resourcepacks';
import { downloadManager } from './downloads';
import { error, FrontendError } from '../error';
import { Process, ProcessContext } from '../process';

export type LoaderInfo = { id: LoaderId; version?: string };

export type ModpackFrontendData = {
  id: string;
  name: string;
  description: string;
  gameVersion: string;
  version: string;
  loader: LoaderInfo;
  java: string | undefined;
  readyForOfflineUse: boolean;
  processes: { id: string; progress: number; blocking: boolean }[];
  lastUsed: number;
  modpackOptions?: Partial<GeneralModpackOptions>;
  icon?: string;
  isDeleted: boolean;
};

export type ModpackData = {
  id: string;
  name: string;
  description: string;
  gameVersion: string;
  version: string;
  loader: LoaderInfo;
};

type StashType = 'successful' | 'semi-successful' | 'unsuccessful';

type Stash = {
  name: string;
  type: StashType;
  id: string;
};

const javaInstallations = findJavaInstallations();

export class VanillaError extends Error {
  constructor() {
    super('Expected modded loader but is vanilla');
  }
}

export class Modpack extends Serializable implements ModpackData {
  __version = '6';
  dir: string;
  isDeleted = false;

  @SerializableProperty
  id: string;
  @SerializableProperty
  name: string;
  @SerializableProperty
  description = '';
  @SerializableProperty
  gameVersion: string;
  @SerializableProperty
  version = '1.0.0';
  @SerializableProperty
  loader: LoaderInfo;
  @SerializableProperty
  stashes: Stash[] = [];
  @SerializableProperty
  source?: ResourceSource;
  @SerializableProperty
  modsContent: ModsContent;
  @SerializableProperty
  shaderpacksContent: ShaderpacksContent;
  @SerializableProperty
  resourcepacksContent: ResourcepacksContent;
  @SerializableProperty('optional')
  launchConfig?: Partial<TLC.LaunchOptions> & {
    root: string;
    version: {
      number: string;
      type: string;
    };
  };
  @SerializableProperty('optional')
  resource?: { provider: ImplementedProvider; id: string; version: string };
  @SerializableProperty('optional')
  modpackOptions?: Partial<GeneralModpackOptions>;
  processes: Process[] = [];
  @SerializableProperty
  lastUsed: number;
  @SerializableProperty('optional')
  java?: string;
  logger: Logger;

  constructor(name: string, gameVersion: string, loader: LoaderInfo) {
    super();

    this.id = randomUUID();
    this.name = name;
    this.gameVersion = gameVersion;
    this.loader = loader;
    this.dir = paths.join(
      modpacksPath,
      this.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 20) +
        '-' +
        this.id,
    );
    this.lastUsed = Date.now();
    this.modsContent = new ModsContent(this, []);
    this.shaderpacksContent = new ShaderpacksContent(this, []);
    this.resourcepacksContent = new ResourcepacksContent(this, []);

    this.logger = log(this.name);

    try {
      ensureDirectoryExists(this.dir);
      this.symlinks();
      this.defaults();

      this.save();
    } catch (e) {
      throw error('Failed to create modpack', e);
    }
  }

  _constructor(version: string, dir: string) {
    this.logger = log(this.name);

    this.dir = paths.join(modpacksPath, dir);
    this.processes = [];

    switch (version) {
      case undefined: {
        this['__version'] = '1';
      }
      case '2': {
        this.modsContent = new ModsContent(this, []);
        this['__version'] = '3';
      }
      case '3': {
        if (typeof this.loader === 'string') {
          this.loader = { id: this.loader } as never;
        } else if (
          typeof this.loader === 'object' &&
          typeof this.loader.id === 'object'
        ) {
          this.loader = this.loader.id as never;
        }
        this['__version'] = '4';
      }
      case '4': {
        this.modsContent.items = (this.modsContent.items as any).map(
          (item: any) => ({
            ...item,
            id: item.filename ?? item.id,
          }),
        ) as never;
        this.symlinks();
        this['__version'] = '5';
      }
      case '5': {
        if (typeof this.java !== 'string') {
          this.java = undefined;
        }
        this['__version'] = '6';
      }
    }

    // Load content manually
    this.modsContent = new ModsContent(
      this,
      (this.modsContent?.items as never) ?? [],
    );
    this.shaderpacksContent = new ShaderpacksContent(
      this,
      (this.shaderpacksContent?.items as never) ?? [],
    );
    this.resourcepacksContent = new ResourcepacksContent(
      this,
      (this.resourcepacksContent?.items as never) ?? [],
    );
  }

  setupContentDirectories() {
    this.modsContent.setupDirectory();
    this.shaderpacksContent.setupDirectory();
    this.resourcepacksContent.setupDirectory();
  }

  symlinks() {
    const links = ['cache'];

    for (const link of links) {
      const target = paths.join(minecraftRootPath, link);
      const path = paths.join(this.dir, link);

      if (fs.existsSync(path)) {
        if (
          fs.lstatSync(path).isDirectory() &&
          fs.readdirSync(path).length === 0
        ) {
          continue;
        } else {
          fs.rmSync(path, { recursive: true, force: true });
        }
      }

      ensureDirectoryExists(target);

      fs.symlinkSync(target, path, 'junction');
    }
  }

  defaults() {
    if (!fs.existsSync(defaultsPath)) {
      return;
    }

    fs.copySync(defaultsPath, this.dir, {
      overwrite: false,
      errorOnExist: false,
      recursive: true,
    });

    this.logger.log('Copied over defaults');
  }

  isModded(loader: LoaderId): loader is ModdedLoaderId {
    if (loader === 'vanilla') {
      return false;
    }

    return true;
  }

  checkModded(loader: LoaderId): asserts loader is ModdedLoaderId {
    if (!this.isModded(loader)) {
      throw new VanillaError();
    }
  }

  get dataPath() {
    return paths.join(this.dir, 'data.json');
  }

  async launcher(ctx: ProcessContext) {
    this.logger.log('Getting launch config');
    const modLoader = TomateLoaders.loader(this.loader.id);

    try {
      this.launchConfig = await modLoader.getMCLCLaunchConfig({
        gameVersion: this.gameVersion,
        loaderVersion: this.loader.version,
        rootPath: minecraftRootPath,
      });

      getSettings().cacheLaunchConfig(
        this.loader.id,
        this.loader.version,
        this.gameVersion,
        this.launchConfig,
      );

      this.invalidate();
    } catch (e) {
      this.logger.warn('Failed to fetch launch config', e);

      if (!this.launchConfig) {
        this.launchConfig = getSettings().getCachedLaunchConfig(
          this.loader.id,
          this.loader.version,
          this.gameVersion,
        );

        if (!this.launchConfig) {
          throw error('Failed to get launch config', e);
        }

        this.launchConfig.root = this.dir;
        this.logger.log('Using cached launch config instead');
      }
    }

    this.logger.log('Setting up MCLC instance');

    const supportLog4jConfigurationFile = isMinecraftVersionAfter(
      '1.17',
      this.gameVersion,
    );

    let progressText = '';
    const launcher = new TLC.Launcher({
      ...this.launchConfig,
      root: this.dir,
      downloadManager,
      customArgs:
        this.modpackOptions?.customLaunchArgs ??
        getSettings().getModpackDefaultOption('customLaunchArgs'),

      log4jConfigurationFile: supportLog4jConfigurationFile
        ? paths.resolve(log4jConfigPath)
        : undefined,

      paths: {
        libraryRoot: minecraftLibrariesPath,
        assetRoot: minecraftAssetRootPath,
        versionRoot: minecraftVersionDirectoryPath,
      },
    });
    launcher.on('debug', (data) => {
      this.logger.verbose(data);
    });
    launcher.on('warn', (data) => {
      this.logger.warn(data);
    });

    launcher.on(
      'data',
      TomateLoaders.liner((data) => {
        if (data.includes('Reloading ResourceManager')) {
          ctx.stop();
          invoke('progress', 0);
        }

        this.logger.mcLog(data);
      }),
    );

    launcher.on('progress', (e) => {
      const progress = e.current / e.total;
      invoke('progress', progress, progressText, `(${e.current} / ${e.total})`);
      ctx.progress(progress);
    });

    launcher.on('close', (exitCode) => {
      ctx.stop();
      invoke('progress', 0);

      this.logger.log(`Minecraft closed with code ${exitCode}`);

      if (exitCode === 0) {
        const latestStash = this.stashes.find(
          (stash) => (stash.name = 'Last successful launch'),
        );
        if (latestStash) {
          try {
            this.removeStash(latestStash.id);
          } catch (e) {
            this.logger.warn('Could not delete lsl cache ', e);
          }
        }

        if (
          this.modpackOptions?.stashLastLaunchEnabled ??
          getSettings().modpackDefaultOptions.stashLastLaunchEnabled
        )
          this.makeStash('Last successful launch', 'successful');
      } else {
        // TODO Error handling
      }
    });

    return launcher;
  }

  async javaPath(launcher: TLC.Launcher) {
    this.logger.log('Getting java version');

    const javaVersion = await launcher.getJavaVersion();
    this.logger.log('Finding java', javaVersion);

    const java =
      this.java ?? javaInstallations.get(javaVersion.majorVersion)?.[0];

    if (java) {
      this.logger.log('Found', java);

      if (process.platform == 'win32') {
        return java.replace(/\.exe$/, 'w.exe');
      }

      return java;
    }

    try {
      await launcher.javaTasks(javaInstallationsPath);
      return undefined;
    } catch (err) {
      throw error('Failed to download java', err);
    }
  }

  async launch(account: Account, quickPlay?: TLC.LaunchOptions['quickPlay']) {
    invoke('progress', 0);
    const ctx = this.process('launch', noop);

    this.lastUsed = Date.now();

    this.logger.log('Account auth');
    const auth = await account.getMclcToken();

    if (!auth) {
      throw new FrontendError('Could not log in');
    }

    try {
      const launcher = await this.launcher(ctx);

      this.logger.log('Launching the game');

      await launcher.launch({
        authorization: auth as never,
        javaPath: await this.javaPath(launcher),
        memory: {
          min: `${
            this.modpackOptions?.minRam ??
            getSettings().getModpackDefaultOption('minRam')
          }M`,
          max: `${
            this.modpackOptions?.maxRam ??
            getSettings().getModpackDefaultOption('maxRam')
          }M`,
        },
        quickPlay,
      });

      return launcher;
    } catch (e) {
      invoke('progress', 0);
      ctx.cancel();
      throw error('Failed to launch', e);
    }
  }

  makeStash(name: string, type: StashType) {
    const id = name + '-' + randomUUID();

    this.save();
    fs.cpSync(this.dir, paths.join(stashesPath, id), {
      recursive: true,
      filter: (source) => {
        if (
          this.modpackOptions?.stashComplete ??
          getSettings().getModpackDefaultOption('stashComplete')
        )
          return true;

        const stat = fs.statSync(source);

        const s = source.replaceAll('\\', '/');
        const includePaths = [
          'defaultconfigs',
          'mods',
          'config',
          'data.json',
          'options.txt',
        ];

        for (let i = 0; i < includePaths.length; i++) {
          if (s.includes(`${this.id}/${includePaths[i]}`)) {
            this.logger.log('Stashing', source);
            return true;
          }
        }

        return stat.isDirectory();
      },
    });

    this.logger.log('Stash complete');

    this.stashes.push({
      name,
      type,
      id,
    });
  }

  removeStash(id: string) {
    const stashPath = paths.join(stashesPath, id);

    if (!fs.existsSync(stashPath)) {
      throw new Error(
        `Could not delete stash "${id}" because the folder does not exist`,
      );
    }

    fs.rmSync(stashPath, { recursive: true });
    this.stashes = this.stashes.filter((stash) => stash.id !== id);
  }

  openExplorer() {
    if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir);

    this.save();

    shell.showItemInFolder(paths.join(this.dir, 'data.json'));
  }

  onClose() {
    for (let process of this.processes) {
      process.cleanUp();
    }

    this.write();
  }

  write() {
    if (this.isDeleted && fs.existsSync(this.dir)) {
      fs.rmSync(this.dir, { recursive: true, force: true });
      return;
    }

    this.save();
  }

  save() {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }

    fs.writeFileSync(this.dataPath, JSON.stringify(this));
  }

  static load(dir: string) {
    const modpackDataPath = paths.join(modpacksPath, dir, 'data.json');

    if (!fs.existsSync(modpackDataPath)) return false;

    const modpack = Modpack.fromJSON(
      fs.readFileSync(modpackDataPath, 'utf8'),
      Modpack,
      dir,
    );
    return modpack;
  }

  isProcessing(id: string) {
    return this.processes.some((p) => p.id === id);
  }

  modProgressId(mod: { id: string; provider: Provider }) {
    return `mod-process-${mod.id}-${mod.provider}`;
  }

  process(id: string, cleanUp: () => void, blocking = true): ProcessContext {
    this.processes.push({ id, progress: 0, cleanUp, blocking });
    this.logger.log('Started process', id);
    this.invalidate();

    return new ProcessContext(this, id, cleanUp);
  }

  content(contentType: ContentType | ProjectType) {
    if (contentType == 'mods' || contentType == 'mod') {
      return this.modsContent;
    }

    if (contentType == 'shaderpacks' || contentType == 'shaderpack') {
      return this.shaderpacksContent;
    }

    if (contentType == 'resourcepacks' || contentType == 'resourcepack') {
      return this.resourcepacksContent;
    }

    throw new Error('Invalid content type');
  }

  static async searchModpack(query: string) {
    let searchResults: SearchResult[] = [];

    const providerIds = enabledProviders;
    for (const providerId of providerIds) {
      try {
        const provider = tomateMods.provider(providerId);

        const queryParams = provider
          .searchQueryParamsBuilder()
          .query(query)
          .modpacks()
          .toString();

        const searchResult = await provider.search(queryParams);

        searchResults.push(searchResult);
      } catch (e) {}
    }

    return tomateMods.mergeSearch({}, ...searchResults);
  }

  invalidate() {
    modpacks.invalidate(this);
  }

  delete() {
    this.isDeleted = true;
    this.save();
    this.invalidate();
  }

  frontendProcesses() {
    return this.processes.map((process) => ({
      id: process.id,
      progress: process.progress,
      blocking: process.blocking,
    }));
  }

  frontendData(): ModpackFrontendData {
    return {
      id: this.id,

      name: this.name,
      description: this.description,
      gameVersion: this.gameVersion,
      version: this.version,
      loader: this.loader,
      processes: this.frontendProcesses(),
      lastUsed: this.lastUsed,
      icon: this.getIcon(),
      isDeleted: this.isDeleted,

      readyForOfflineUse:
        !!this.launchConfig ||
        !!getSettings().getCachedLaunchConfig(
          this.loader.id,
          this.loader.version,
          this.gameVersion,
        ),
      modpackOptions: this.modpackOptions,
      java: this.java,
    };
  }

  getIconPath() {
    return paths.join(this.dir, 'icon.png');
  }

  getIcon() {
    const iconPath = this.getIconPath();
    return imageSync(iconPath);
  }

  setIcon(path: string) {
    const iconPath = this.getIconPath();

    fs.cpSync(path, iconPath);
    this.invalidate();
  }

  setIconFromUrl(url: string) {
    if (url.startsWith('data:')) {
      const base64 = url.replace(/^data:.+;base64,/, '');
      fs.writeFileSync(this.getIconPath(), Buffer.from(base64, 'base64'));
      return this.invalidate();
    }

    return this.downloadIcon(url);
  }

  resetIcon() {
    this.logger.log('reset icon');
    const iconPath = this.getIconPath();

    if (fs.existsSync(iconPath)) {
      fs.rmSync(iconPath);
      this.invalidate();
    }
  }

  async downloadIcon(url: string) {
    try {
      await downloadFileFromUrl(url, this.getIconPath());
    } catch (e) {
      throw error('Falied to download icon', e);
    }

    this.invalidate();
  }

  toString() {
    return `${this.name}:${this.id}`;
  }
}
