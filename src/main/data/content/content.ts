import type {
  Dependency,
  Project,
  Provider,
  SearchResult,
  Version,
} from 'tomate-mods';
import { SyncedIdSet } from '../../../common/synced/synced-id-set/backend';
import { identity } from '@vueuse/core';
import { type EnabledProvider, enabledProviders, tomateMods } from './lib';
import fs from 'node:fs';
import { Modpack } from '../modpack';
import {
  deleteDirectoryIfEmpty,
  ensureDirectoryExists,
  noop,
} from '../../utils';
import { log } from '../../../common/logging/log';
import paths from 'node:path';
import { error } from '../../error';

export type ContentType = 'mods' | 'shaderpacks' | 'resourcepacks';

export type ContentVersion = {
  id: string;

  dependencies: Dependency[];
};

export type ResourceSource = 'origin' | 'local';

export type ContentProject = {
  id: string;
  slug: string;

  name: string;
  description: string;
  icon?: string;
};

export type ContentState = 'INSTALLING' | 'INSTALLED' | 'CHECKING' | 'REMOVED';

export type ContentItem = {
  provider: Provider | 'unknown';

  project?: ContentProject;
  version?: ContentVersion;

  disabled: boolean;
  group?: string;

  /**
   * Filename
   */
  id: string;

  /**
   * Has this mod been added after installing a modpack?
   * If this is not set to local, then you shouldn't be able to remove the mod (You can still disable it)
   */
  source: ResourceSource;

  state: ContentState;
  stateProgress?: number;
};

const logger = log('content');

export abstract class Content {
  items: SyncedIdSet<ContentItem>;
  private lock: Map<string, Promise<void>> = new Map();

  constructor(
    public modpack: Modpack,
    items: ContentItem[],
    private type: ContentType,
  ) {
    this.items = SyncedIdSet.ofList(`${modpack.id}-${type}`, items, identity);
    this.setupDirectory();
  }

  setupDirectory() {
    ensureDirectoryExists(this.getPath());
  }

  private exists(project: Project) {
    return this.items
      .values()
      .some(
        (item) =>
          item.project?.slug === project.slug ||
          item.project?.name === project.name,
      );
  }

  private async locked(key: string, func: () => Promise<void>) {
    const lock = this.lock.get(key);
    if (lock) {
      await lock;
    }

    const promise = func();
    this.lock.set(key, promise);
    return promise;
  }

  async install(
    providerId: EnabledProvider,
    version: Version,
    source: ResourceSource,
    downloadDependencies?: boolean,
    filename?: string,
  ) {
    const ctx = this.modpack.process(
      `content-${this.type}-install-${providerId}-${version.id}`,
      noop,
      this.type === 'mods',
    );

    filename = filename ?? version.files[0].filename;

    try {
      const provider = tomateMods.provider(providerId);
      const project = await provider.project(version.projectId);

      const path = this.getPath(filename);

      await this.locked(filename, async () => {
        const existing = this.items.get(filename);

        if (
          existing?.version?.id == version.id &&
          existing.state !== 'INSTALLING'
        ) {
          return;
        }

        this.items.push({
          provider: providerId,
          project,
          version,
          disabled: false,
          id: filename,
          source,
          state: 'INSTALLING',
        });

        let deps: Promise<void>[] = [];
        if (
          downloadDependencies != undefined
            ? downloadDependencies
            : source == 'local'
        ) {
          deps = version.dependencies
            .filter((dependency) => dependency.dependencyType === 'required')
            .filter(
              (dependency) =>
                !(
                  (dependency.projectId &&
                    this.items
                      .values()
                      .some(
                        (item) => item.project?.id == dependency.projectId,
                      )) ||
                  (dependency.versionId &&
                    this.items
                      .values()
                      .some((item) => item.version?.id == dependency.versionId))
                ),
            )
            .map(async (dependency) => {
              if (dependency.versionId) {
                const version = await provider.version(
                  dependency.projectId as never,
                  dependency.versionId,
                );
                const project = await provider.project(
                  dependency.projectId as never,
                );

                if (this.exists(project)) {
                  return;
                }

                await this.modpack
                  .content(project.type ?? 'other')
                  .install(providerId, version, 'local');
              } else if (dependency.projectId) {
                const project = await provider.project(
                  dependency.projectId as never,
                );

                if (this.exists(project)) {
                  return;
                }

                await this.modpack
                  .content(project.type ?? 'other')
                  .installLatest(providerId, dependency.projectId, 'local');
              }
            });
        }

        await provider.download(version, path + '.tmp', {
          onProgress: (progress) => {
            this.setStateProgress(filename, progress);
            ctx.progress(progress);
          },
          minProgressSize: 256 * 1024,
        });

        await Promise.all(deps);

        await fs.promises.rename(path + '.tmp', path);

        this.setStateProgress(filename, undefined);

        this.setState(filename, 'INSTALLED');
      });

      return filename;
    } catch (e) {
      this.setState(filename, 'REMOVED');
      throw error('Failed to install content', e);
    } finally {
      ctx.stop();
    }
  }

  async installLatest(
    provider: EnabledProvider,
    id: string,
    source: ResourceSource,
    downloadDependencies?: boolean,
  ) {
    const versions = await this.versions(provider, id);

    if (!versions.length) {
      throw new Error('No version found');
    }

    return this.install(provider, versions[0], source, downloadDependencies);
  }

  async replaceLatest(
    provider: EnabledProvider,
    id: string,
    projectId: string,
    source: ResourceSource,
    downloadDependencies?: boolean,
  ) {
    const versions = await this.versions(provider, projectId);

    if (!versions.length) {
      throw new Error('No version found');
    }

    return this.replaceVersion(
      provider,
      id,
      versions[0],
      source,
      downloadDependencies,
    );
  }

  async replaceVersion(
    provider: EnabledProvider,
    id: string,
    version: Version,
    source: ResourceSource,
    downloadDependencies?: boolean,
  ) {
    const oldItem = this.items.get(id);

    if (!oldItem) {
      throw new Error('Item does not exist');
    }

    if (oldItem.version?.id == version.id) {
      return;
    }

    try {
      await this.install(provider, version, source, downloadDependencies, id);
    } catch (e) {
      this.items.push(oldItem);

      throw e;
    }

    if (oldItem.disabled) {
      const newItem = this.items.get(id);
      if (!newItem) {
        throw new Error('New item does not exist');
      }

      await this.disable(newItem);
    }
  }

  async versions(provider: EnabledProvider, id: string) {
    return tomateMods
      .provider(provider)
      .versions(id, this.versionQueryParams(provider));
  }

  delete(id: string) {
    const item = this.items.get(id);

    if (!item) {
      throw new Error('Item does not exist');
    }

    const itemPath = this.getItemPath(item);

    if (fs.existsSync(itemPath)) {
      fs.rmSync(itemPath);
    }

    this.items.remove(id);
  }

  async toggleDisabled(id: string) {
    const item = this.items.get(id);

    if (!item) {
      throw new Error('Item does not exist');
    }

    if (item.disabled) {
      await this.enable(item);
    } else {
      await this.disable(item);
    }
  }

  getItemPath(item: ContentItem) {
    return item.disabled
      ? this.getDisabledPath(item.id)
      : this.getPath(item.id);
  }

  async disable(item: ContentItem) {
    ensureDirectoryExists(this.getDisabledPath());

    await fs.promises.rename(
      this.getItemPath(item),
      this.getDisabledPath(item.id),
    );

    item.disabled = true;
    this.items.invalidate(item);
  }
  async enable(item: ContentItem) {
    await fs.promises.rename(this.getItemPath(item), this.getPath(item.id));

    deleteDirectoryIfEmpty(this.getDisabledPath());

    item.disabled = false;
    this.items.invalidate(item);
  }

  async updateFromFiles() {
    if (this.modpack.isProcessing('update-from-files')) {
      return;
    }

    const ctx = this.modpack.process('update-from-files', noop, false);

    try {
      const filenames = fs.readdirSync(this.getPath());

      const missingFilenames = filenames.filter(
        (filename) =>
          (!this.items.has(filename) ||
            this.items.get(filename)?.state === 'CHECKING') &&
          this.isContent(filename),
      );

      const removedMods = this.items
        .values()
        .filter((mod) => !filenames.includes(mod.id) && !mod.disabled);

      const previouslyRemovedMods = this.items
        .values()
        .filter((mod) => filenames.includes(mod.id) && mod.state === 'REMOVED');

      for (const removedMod of removedMods) {
        this.setState(removedMod.id, 'REMOVED');
      }

      for (const removedMod of previouslyRemovedMods) {
        this.setState(removedMod.id, 'INSTALLED');
      }

      for (const filename of missingFilenames) {
        this.items.push({
          provider: 'unknown',
          id: filename,
          disabled: false,
          source: 'local',
          state: 'CHECKING',
        });
      }

      let i = 0;
      await Promise.allSettled(
        missingFilenames.map(async (filename) => {
          const filepath = this.getPath(filename);
          const item = await this.itemFromFile(filepath, 'local');

          ctx.progress(++i / missingFilenames.length);

          this.items.push(item);
        }),
      );

      logger.log('Update from files done');
    } finally {
      ctx.stop();
    }
  }

  async search(query: string) {
    let searchResults: SearchResult[] = [];
    const providers = enabledProviders;

    for (const provider of providers) {
      try {
        const searchResult = await tomateMods
          .provider(provider)
          .search(this.searchQueryParams(query, provider));

        searchResults.push(searchResult);
      } catch (e) {
        logger.warn(e);
      }
    }

    return tomateMods.mergeSearch({}, ...searchResults);
  }

  async itemFromFile(
    path: string,
    source: ResourceSource,
  ): Promise<ContentItem> {
    const { version, provider } = (await tomateMods.fileVersion(path)) ?? {};
    const filename = paths.basename(path);

    // TODO
    if (!version || !provider) {
      return {
        id: filename,
        provider: 'unknown',
        version,
        disabled: false,
        source,
        state: 'INSTALLED',
      };
    }

    const project = await tomateMods
      .provider(provider)
      .project(version.projectId);

    return {
      id: filename,
      provider,
      project,
      version,
      disabled: false,
      source,
      state: 'INSTALLED',
    };
  }

  async import(path: string) {
    const filename = paths.basename(path);
    const item = await this.itemFromFile(path, 'local');

    fs.cpSync(path, this.getPath(filename));

    this.items.push(item);
  }

  setState(id: string, state: ContentState) {
    const item = this.items.get(id)!;
    item.state = state;

    this.items.invalidate(item);
  }

  setStateProgress(id: string, stateProgress: number | undefined) {
    const item = this.items.get(id)!;
    item.stateProgress = stateProgress;

    this.items.invalidate(item);
  }

  abstract searchQueryParams(query: string, provider: EnabledProvider): string;
  abstract versionQueryParams(provider: EnabledProvider): string;
  abstract getPath(...paths: string[]): string;
  abstract getDisabledPath(...paths: string[]): string;
  abstract isContent(filename: string): boolean;

  toJSON() {
    return { items: Array.from(this.items.values()) };
  }
}
