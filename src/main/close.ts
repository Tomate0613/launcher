import { app } from 'electron';
import { getAllProcesses } from './process';
import { mainWindow } from './windows';

export async function saveClose() {
  if (
    mainWindow &&
    !mainWindow.isDestroyed() &&
    mainWindow.webContents &&
    !mainWindow.webContents.isDestroyed()
  ) {
    mainWindow.close();
  }

  const processes = getAllProcesses();

  for (const process of processes) {
    await process.wait();
  }

  app.quit();
}
