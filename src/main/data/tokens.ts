import { CurseforgeProvider } from 'tomate-mods';
import { basePath, tokensPath } from '../paths';
import { tomateMods, userAgent } from './content/lib';
import { Serializable, SerializableProperty } from './serialization';
import fs from 'node:fs';
import { FrontendError } from '../error';

export type TokensFrontendData = {
  hasCurseforgeToken: boolean;
  compiledWithCurseforgeToken: boolean;
};

export class Tokens extends Serializable {
  __version = '1';

  @SerializableProperty('optional')
  private curseforgeToken?: string;

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

  save() {
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }

    fs.writeFileSync(tokensPath, JSON.stringify(this));
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
  }

  static load() {
    if (fs.existsSync(tokensPath)) {
      return Tokens.fromJSON(fs.readFileSync(tokensPath, 'utf8'), Tokens);
    } else {
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
