import { ipcMain } from 'electron';
import { consoleTransport } from './transports/consoleTransport';
import { LogLevel, configureTransports, log } from './log';
import { ipcMainTransport } from './transports/ipcMainTransport';
import { fileTransport } from './transports/fileTransport';
import { is } from '@electron-toolkit/utils';

configureTransports(
  [
    { transport: consoleTransport, level: 'verbose' },
    { transport: ipcMainTransport, level: is.dev ? 'verbose' : 'info' },
    { transport: fileTransport, level: 'info' },
  ],
  'main',
);

ipcMain.handle(
  'log',
  (_e, level: LogLevel, channel: string, thread: string, data: unknown[]) => {
    consoleTransport(level, channel, thread, data);
    fileTransport(level, channel, thread, data);
  },
);

const logger = log('uncaught');

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:\n', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection\n', promise, 'Reason:\n', reason);
});
