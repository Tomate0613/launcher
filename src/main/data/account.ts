import { Auth, Minecraft, Xbox } from 'msmc';
import { Serializable, SerializableProperty } from './serialization';
import { randomUUID } from 'node:crypto';
import { accounts } from '../data';
import { log } from '../../common/logging/log';
import path from 'node:path';
import { skinCachePath } from '../paths';
import fs from 'node:fs/promises';
import axios from 'axios';
import crypto from 'node:crypto';
import { FrontendError } from '../error';

const logger = log('account');

export type MCProfile = {
  id: string;
  name: string;
  skins?: Array<{
    id: string;
    state: 'ACTIVE';
    url: string;
    variant: 'SLIM' | 'CLASSIC';
  }>;
  capes?: Array<{
    id: string;
    state: 'ACTIVE';
    url: string;
    alias: string;
  }>;
  demo?: boolean;
};

/**
 * A copy of the user object mclc uses
 */
export type MclcUser = {
  access_token: string;
  client_token?: string;
  uuid: string;
  name?: string;
  meta?: {
    refresh: string;
    exp?: number;
    type: 'mojang' | 'msa' | 'legacy';
    xuid?: string;
    demo?: boolean;
  };
  user_properties?: Partial<any>;
};

export type AccountType = 'demo' | 'offline' | 'msa';

export type AccountFrontendData = {
  name?: string;
  readyForOfflineUse: boolean;
  profile?: MCProfile;
  id: string;
  type: AccountType;
};

export class Account extends Serializable {
  __version = '1';
  minecraft?: Minecraft;
  xbox?: Xbox;

  @SerializableProperty('optional')
  refreshToken?: string;
  @SerializableProperty('optional')
  cachedMclcAccount?: MclcUser;
  @SerializableProperty
  type: AccountType;
  @SerializableProperty('optional')
  name?: string;
  @SerializableProperty
  id: string;

  constructor(id: string, type: AccountType) {
    super();

    this.id = id;
    this.type = type;
  }

  _constructor() {}

  async loadExisting() {
    if (!this.refreshToken) throw new Error('Refresh token is missing');

    const auth = new Auth('select_account');

    const xbox = await auth.refresh(this.refreshToken);
    return this.setData(xbox);
  }

  static async login() {
    const auth = new Auth('select_account');
    const xbox = await auth.launch('electron');
    const social = await xbox.getSocial();
    const profile = await social.getProfile();

    const account = new Account(profile.xuid, 'msa');
    account.setData(xbox);

    return account;
  }

  static demo() {
    const account = new Account('demo', 'demo');
    account.name = 'Demo';

    return account;
  }

  static offline(name: string) {
    const account = new Account(`offline-${randomUUID()}`, 'offline');
    account.name = name;

    return account;
  }

  async setData(xbox: Xbox) {
    this.xbox = xbox;
    this.minecraft = await xbox.getMinecraft();

    const social = await xbox.getSocial();
    const profile = await social.getProfile();

    this.refreshToken = xbox.save();
    this.name = profile.name;
    this.id = profile.xuid;

    this.invalidate();

    this.cacheSkins();
  }

  private async cacheSkins() {
    if (!this.minecraft) {
      return;
    }

    const skins = this.minecraft.profile?.skins;
    if (skins) {
      for (const skin of skins) {
        logger.log(`Caching skin ${skin.id}`);
        try {
          const response = await axios.get(skin.url, {
            responseType: 'arraybuffer',
          });
          const fileBuffer = Buffer.from(response.data);

          const hash = crypto
            .createHash('sha1')
            .update(fileBuffer)
            .digest('hex');

          const filename = `${hash}.png`;
          await fs.writeFile(path.join(skinCachePath, filename), fileBuffer);
        } catch {
          logger.warn(`Failed to cache skin ${skin.id}`);
        }
      }
    }
  }

  async getMclcToken() {
    if (this.type === 'demo') {
      return {
        access_token: '123',
        client_token: 'avc',
        uuid: randomUUID(),
        name: 'Demo',
        user_properties: {},
        meta: {
          type: 'msa',
          demo: true,
          refresh: 'abc',
        },
      } as const;
    }

    if (this.type === 'offline') {
      return {
        access_token: '123',
        client_token: 'avc',
        uuid: randomUUID(),
        name: this.name ?? 'Offline',
        user_properties: {},
        meta: {
          type: 'msa',
          demo: false,
          refresh: 'abc',
        },
      } as const;
    }

    if (!this.minecraft) {
      try {
        await this.loadExisting();
      } catch (e) {
        logger.warn('Could not load account');

        if (!this.cachedMclcAccount) {
          throw new FrontendError(
            'Could not load account and no cache available',
          );
        }
      }
    }

    if (this.minecraft) {
      this.cachedMclcAccount = this.minecraft.mclc();
    }

    return this.cachedMclcAccount;
  }

  async setCape(id: string) {
    const token = await this.getMclcToken();
    const url =
      'https://api.minecraftservices.com/minecraft/profile/capes/active';

    const cape = this.minecraft?.profile?.capes?.find((cape) => cape.id === id);
    const activeCape = this.minecraft?.profile?.capes?.find(
      (cape) => cape.state === 'ACTIVE',
    );

    if (!cape) {
      throw new Error('User does not own cape');
    }

    if (!token?.access_token) {
      throw new Error('Could not set cape, no token');
    }

    const result = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.access_token}`,
      },
      body: JSON.stringify({
        capeId: id,
      }),
    });

    if (result.status != 200) {
      logger.error(await result.text());
      throw new Error('Failed to set cape');
    }

    if (activeCape) {
      activeCape.state = 'INACTIVE' as never;
    }

    cape.state = 'ACTIVE';

    this.invalidate();
  }

  async setSkin(skinUrl: string) {
    const token = await this.getMclcToken();
    const url = 'https://api.minecraftservices.com/minecraft/profile/skins';

    if (!token?.access_token) {
      throw new Error('Could not set cape, no token');
    }

    const result = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.access_token}`,
      },
      body: JSON.stringify({
        variant: 'classic',
        url: skinUrl,
      }),
    });

    if (result.status != 200) {
      logger.error(await result.text());
      throw new Error('Failed to set skin');
    }

    const active = this.minecraft?.profile?.skins?.find(
      (skin) => skin.state === 'ACTIVE',
    );

    if (active) {
      active.state = 'INACTIVE' as never;
    }

    const chosen = this.minecraft?.profile?.skins?.find(
      (skin) => skin.url === skinUrl,
    );

    if (chosen) {
      chosen.state = 'ACTIVE';
    }

    this.invalidate();
  }

  async uploadSkin(buffer: ArrayBuffer) {
    const token = await this.getMclcToken();
    const url = 'https://api.minecraftservices.com/minecraft/profile/skins';

    if (!token?.access_token) {
      throw new Error('Could not set cape, no token');
    }

    const blob = new Blob([buffer], { type: 'image/png' });
    const file = new File([blob], `${randomUUID()}.png`, { type: 'image/png' });

    const formData = new FormData();
    formData.append('variant', 'classic');
    formData.append('file', file);

    const result = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
      body: formData,
    });

    if (result.status != 200) {
      logger.error(await result.text());
      throw new Error('Failed to upload skin');
    }

    const active = this.minecraft?.profile?.skins?.find(
      (skin) => skin.state === 'ACTIVE',
    );
    if (active) {
      active.state = 'INACTIVE' as never;
    }

    if (this.minecraft?.profile?.skins) {
      const newProfile = await result.json();
      const newActive = newProfile.skins.find(
        (skin: any) => skin.state === 'ACTIVE',
      );

      this.minecraft.profile.skins.push(newActive);

      this.invalidate();
      await this.cacheSkins();
    }
  }

  isVisible() {
    if (!this.name) return false;

    return true;
  }

  sanitize(data: string) {
    // Skip if account was not used
    if (!this.cachedMclcAccount || !this.refreshToken) {
      return data;
    }

    // Remove tokens from data
    return data
      .replaceAll(this.cachedMclcAccount.access_token, '[ACCESS TOKEN]')
      .replaceAll(
        this.cachedMclcAccount.client_token ?? '[CLIENT TOKEN]',
        '[CLIENT TOKEN]',
      )
      .replaceAll(this.refreshToken, '[REFRESH TOKEN]');
  }

  frontendData(): AccountFrontendData {
    if (!this.id) {
      throw new Error('Account is not loaded yet');
    }

    return {
      name: this.name,
      id: this.id,
      type: this.type,
      profile: this.minecraft?.profile,
      readyForOfflineUse: !!this.cachedMclcAccount || this.type !== 'msa',
    };
  }

  invalidate() {
    accounts.invalidate(this);
  }

  delete() {
    accounts.remove(this);
  }

  toString() {
    return `${this.name}:${this.id}`;
  }
}
