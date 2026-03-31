import { app } from 'electron';
import { log } from '../common/logging/log';

const logger = log('protocol');

export const PROTOCOL = 'tomate-launcher';

if (!app.isDefaultProtocolClient(PROTOCOL)) {
  const re = app.setAsDefaultProtocolClient(PROTOCOL);

  if (!re) {
    logger.warn('Failed to set app as default for protocol');
  }
}

app.on('open-url', async (event, url) => {
  event.preventDefault();

  logger.log(url);
});
