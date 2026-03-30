import { Content, ContentItem } from './content';
import path from 'node:path';
import { Modpack } from '../modpack';
import {  tomateMods } from './lib';
import type { ImplementedProvider } from 'tomate-mods';

export class ShaderpacksContent extends Content {
  constructor(modpack: Modpack, items: ContentItem[]) {
    super(modpack, items, 'shaderpacks');
  }

  searchQueryParams(query: string, provider: ImplementedProvider): string {
    return tomateMods
      .provider(provider)
      .searchQueryParamsBuilder()
      .query(query)
      .gameVersion(this.modpack.gameVersion)
      .shaderpacks()
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
    return path.join(this.modpack.dir, 'shaderpacks', ...paths);
  }

  getDisabledPath(...paths: string[]): string {
    return path.join(this.modpack.dir, 'disabled-shaderpacks', ...paths);
  }

  isContent(filename: string): boolean {
    return filename.endsWith('.zip');
  }
}
