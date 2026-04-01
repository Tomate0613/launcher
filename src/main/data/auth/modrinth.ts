import { log } from '../../../common/logging/log';
import * as client from 'openid-client';
import { getTokens } from '../../data';
import { openInBrowser } from '../../utils';
import { error } from '../../error';

const logger = log('modrinth-oauth');

const CLIENT_SECRET = __MODRINTH_CLIENT_SECRET__;
const CLIENT_ID = __MODRINTH_CLIENT_ID__;

const AUTHORIZATION_PAGE_URL = 'https://modrinth.com/auth/authorize';
const TOKEN_EXCHANGE_URL = 'https://api.modrinth.com/_internal/oauth/token';
const REDIRECT_URL = `tomate-launcher://modrinth-oauth-callback`;
const ISSUER_URL = 'https://modrinth.com';

function ModrinthAuth(clientSecret: string) {
  return ((_e, client, body, headers) => {
    headers.set('authorization', clientSecret);
    body.set('client_id', client.client_id);
  }) satisfies client.ClientAuth;
}

const config = new client.Configuration(
  {
    issuer: ISSUER_URL,
    authorization_endpoint: AUTHORIZATION_PAGE_URL,
    token_endpoint: TOKEN_EXCHANGE_URL,
  },
  CLIENT_ID,
  undefined,
  ModrinthAuth(CLIENT_SECRET),
);

export class ModrinthOAuth {
  private codeVerifier!: string;
  private state!: string;

  private static open: ModrinthOAuth[];

  private constructor() {}

  static async start() {
    const oauth = new ModrinthOAuth();
    oauth.codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(
      oauth.codeVerifier,
    );
    oauth.state = client.randomState();

    const authUrl = client.buildAuthorizationUrl(config, {
      redirect_uri: REDIRECT_URL,
      scope: 'PROJECT_READ VERSION_READ COLLECTION_READ ORGANIZATION_READ',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: oauth.state,
    });

    openInBrowser(authUrl.href);

    this.open.unshift(oauth);
    return oauth;
  }

  static async onCallback(url: URL) {
    for (const open of this.open) {
      try {
        await open.onCallback(url);
        return;
      } catch (e) {
        logger.warn(error('Failed to perform modrinth oauth', e));
      }
    }
  }

  async onCallback(url: URL) {
    const grant = await client.authorizationCodeGrant(config, url, {
      pkceCodeVerifier: this.codeVerifier,
      expectedState: this.state,
    });

    getTokens().setModrinthToken(grant.access_token, grant.expires_in!);
    logger.log('Successfully authenticated');

    ModrinthOAuth.open = ModrinthOAuth.open.filter((e) => e !== this);
  }
}
