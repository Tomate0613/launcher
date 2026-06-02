import { app } from 'electron';
import { getAllProcesses } from './process';
import { mainWindow } from './windows';
import { log } from '../common/logging/log';

const logger = log('close');

export async function safeClose() {
  logger.log('Closing safely');

  if (
    mainWindow &&
    !mainWindow.isDestroyed() &&
    mainWindow.webContents &&
    !mainWindow.webContents.isDestroyed()
  ) {
    mainWindow.close();
  }

  const processes = getAllProcesses();

  setTimeout(() => {
    logger.log('Reached timeout. Force quitting');

    for (const process of processes) {
      logger.log('Cancelling process', process);
      process.cancel();
    }

    app.quit();
  }, 60000);

  for (const process of processes) {
    logger.log('Waiting for process', process);
    await process.wait();
  }

  app.quit();
}
