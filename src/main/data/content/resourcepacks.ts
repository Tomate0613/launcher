import { Content, ContentItem } from './content';
import path from 'node:path';
import { Modpack } from '../modpack';
import { tomateMods } from './lib';
import type { ImplementedProvider } from 'tomate-mods';

export class ResourcepacksContent extends Content {
  constructor(modpack: Modpack, items: ContentItem[]) {
    super(modpack, items, 'resourcepacks');
  }

  searchQueryParams(query: string, provider: ImplementedProvider): string {
    return tomateMods
      .provider(provider)
      .searchQueryParamsBuilder()
      .query(query)
      .gameVersion(this.modpack.gameVersion)
      .resourcepacks()
      .toString();
  }

  versionQueryParams(provider: ImplementedProvider): string {
    return tomateMods
      .provider(provider)
      .versionQueryParamsBuilder()
      .gameVersion(this.modpack.gameVersion)
      .toString();
  }

  getPath(...paths: string[]): string {
    return path.join(this.modpack.dir, 'resourcepacks', ...paths);
  }

  getDisabledPath(...paths: string[]): string {
    return path.join(this.modpack.dir, 'disabled-resourcepacks', ...paths);
  }

  isContent(filename: string): boolean {
    return filename.endsWith('.zip');
  }
}
