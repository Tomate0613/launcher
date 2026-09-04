import fs from 'node:fs/promises';
import { CurseforgeProvider, ModrinthProvider } from 'tomate-mods';
import { tokensPath } from '../paths';
import { tomateMods, userAgent } from './content/lib';
import { Serializable, SerializableProperty } from './serialization';
import { FrontendError } from '../error';

export type TokensFrontendData = {
  hasCurseforgeToken: boolean;
  compiledWithCurseforgeToken: boolean;
};

export class Tokens extends Serializable {
  __version = '1';

  @SerializableProperty('optional')
  private curseforgeToken?: string;

  @SerializableProperty('optional')
  private modrinthAuth?: {
    accessToken: string;
    expiresAt: number;
  };

  async setCurseforgeToken(token: string) {
    if (!token) {
      this.curseforgeToken = undefined;
      this.apply();
      return;
    }

    try {
      await new CurseforgeProvider(userAgent, token).hello();
    } catch (err) {
      throw new FrontendError('Could not validate token');
    }

    this.curseforgeToken = token;
    this.apply();
  }

  setModrinthToken(accessToken: string, expiresIn: number) {
    this.modrinthAuth = {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    this.apply();
  }

  apply() {
    tomateMods.removeProvider('curseforge');

    if (this.curseforgeToken || __CURSEFORGE_API_KEY__) {
      tomateMods.addProvider(
        new CurseforgeProvider(
          userAgent,
          this.curseforgeToken || __CURSEFORGE_API_KEY__,
        ),
      );
    }

    if (this.modrinthAuth && Date.now() < this.modrinthAuth.expiresAt) {
      const mr = new ModrinthProvider(userAgent, this.modrinthAuth.accessToken);
      tomateMods.addProvider(mr);
    }
  }

  save() {
    return fs.writeFile(tokensPath, JSON.stringify(this));
  }

  static async load() {
    try {
      return Tokens.fromJSON(await fs.readFile(tokensPath, 'utf8'), Tokens);
    } catch {
      return new Tokens();
    }
  }

  frontendData(): TokensFrontendData {
    return {
      hasCurseforgeToken: !!this.curseforgeToken,
      compiledWithCurseforgeToken: !!__CURSEFORGE_API_KEY__,
    };
  }
}
