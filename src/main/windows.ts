import { BrowserWindow } from 'electron';

export let mainWindow: BrowserWindow | undefined;

export function setMainWindow(_mainWindow: BrowserWindow) {
  mainWindow = _mainWindow;
}
