import { Content, ContentItem } from './content';
import path from 'node:path';
import { Modpack } from '../modpack';
import { loader } from 'tomate-loaders';
import { tomateMods } from './lib';
import { ImplementedProvider } from 'tomate-mods';

export class ModsContent extends Content {
  constructor(modpack: Modpack, items: ContentItem[]) {
    super(modpack, items, 'mods');
  }

  searchQueryParams(query: string, provider: ImplementedProvider): string {
    this.modpack.checkModded(this.modpack.loader.id);
    const modLoader = loader(this.modpack.loader.id).tomateModsModLoader;

    return tomateMods
      .provider(provider)
      .searchQueryParamsBuilder()
      .query(query)
      .loader(modLoader)
      .gameVersion(this.modpack.gameVersion)
      .mods()
      .toString();
  }

  versionQueryParams(provider: ImplementedProvider): string {
    this.modpack.checkModded(this.modpack.loader.id);
    const modLoader = loader(this.modpack.loader.id).tomateModsModLoader;

    return tomateMods
      .provider(provider)
      .versionQueryParamsBuilder()
      .loader(modLoader)
      .gameVersion(this.modpack.gameVersion)
      .toString();
  }

  getPath(...paths: string[]): string {
    return path.join(this.modpack.dir, 'mods', ...paths);
  }

  getDisabledPath(...paths: string[]): string {
    return path.join(this.modpack.dir, 'disabled-mods', ...paths);
  }

  isContent(filename: string): boolean {
    return filename.endsWith('.jar');
  }
}
