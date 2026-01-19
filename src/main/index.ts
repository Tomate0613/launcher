import { app, BrowserWindow, shell } from 'electron';
import { hideBin } from 'yargs/helpers';
import { join } from 'node:path';
import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import icon from '../../assets/icon.png?asset';
import { getSettings, loadData } from './data';
import * as Windows from './windows';
import '../common/logging/logMain';
import { parseArgs } from './cli';
import { log } from '../common/logging/log';
import { ensureAppDirectoriesExist } from './paths';

const logger = log('main');

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    show: false,
    center: true,
    width: 1200,
    height: 680,
    minWidth: 960,
    minHeight: 540,
    transparent: getSettings().transparentWindow,
    frame: !getSettings().hideFrame,
    autoHideMenuBar: true,
    darkTheme: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
    },
  });

  let hasMinimized = false;

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();

    if (is.dev && !hasMinimized && process.platform !== 'linux') {
      mainWindow.minimize();
      hasMinimized = true;
    }
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  Windows.setMainWindow(mainWindow);
}

if (app.requestSingleInstanceLock()) {
  app.on('second-instance', (_event, args) => {
    const { mainWindow } = Windows;

    logger.log(args);

    if (args.some((a) => a.endsWith('dist/electron'))) {
      parseArgs(args.slice(args.findIndex((a) => a === '.') + 1));
    } else {
      parseArgs(hideBin(args));
    }

    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
      mainWindow.show();
    }
  });

  parseArgs(hideBin(process.argv));
} else {
  logger.log('Already open. Exiting');
  app.exit(0);
}

export function prepare() {
  ensureAppDirectoriesExist();
  loadData();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');
  prepare();

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window, {
      zoom: true,
      escToCloseWindow: false,
    });
  });

  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
