import { Content, ContentItem } from './content';
import path from 'path';
import { Modpack } from '../modpack';
import { type EnabledProvider, tomateMods } from './lib';

export class ShaderpacksContent extends Content {
  constructor(modpack: Modpack, items: ContentItem[]) {
    super(modpack, items, 'shaderpacks');
  }

  searchQueryParams(query: string, provider: EnabledProvider): string {
    return tomateMods
      .provider(provider)
      .searchQueryParamsBuilder()
      .query(query)
      .gameVersion(this.modpack.gameVersion)
      .shaderpacks()
      .toString();
  }

  versionQueryParams(provider: EnabledProvider): string {
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
