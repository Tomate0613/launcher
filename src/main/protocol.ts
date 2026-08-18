import { app } from 'electron';
import { log } from '../common/logging/log';

const logger = log('protocol');

export const PROTOCOL = 'tomate-launcher';

export function registerProtocolHandler() {
  if (!app.isDefaultProtocolClient(PROTOCOL)) {
    const re = app.setAsDefaultProtocolClient(PROTOCOL);

    if (!re) {
      logger.warn(
        'Failed to set app as default tomate-launcher:// protocol handler',
      );
    }
  }

  app.on('open-url', async (event, url) => {
    event.preventDefault();
    handleProtocolUrl(url);
  });
}

export async function handleProtocolUrl(url: string) {
  const parsed = new URL(url);
  if (parsed.host === 'modrinth-oauth-callback') {
    (await import('./data/auth/modrinth')).ModrinthOAuth.onCallback(parsed);
  }
}
