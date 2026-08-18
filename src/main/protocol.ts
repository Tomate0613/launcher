import { app } from 'electron';
import { log } from '../common/logging/log';
import path from 'node:path';

const logger = log('protocol');

export const PROTOCOL = 'tomate-launcher';

export function registerProtocolHandler() {
  logger.verbose('Registering protocol handlers');

  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      const re = app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
        path.resolve(process.argv[1]),
      ]);

      if (!re) {
        logger.warn(
          'Failed to set app as default tomate-launcher:// protocol handler',
        );
      }
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }

  logger.verbose('Check done');

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
