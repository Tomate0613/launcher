import { type LogLevel, configureTransports, log } from './log';
import { consoleTransport } from './transports/consoleTransport';
import { frontendLoggerTransport } from './transports/frontendLoggerTransport';
import { ipcRendererTransport } from './transports/ipcRendererTransport';

configureTransports(
  [
    { transport: consoleTransport, level: 'info' },
    { transport: frontendLoggerTransport, level: 'verbose' },
    { transport: ipcRendererTransport, level: 'info' },
  ],
  'renderer',
);

window.api.on(
  'log',
  (_e, level: LogLevel, channel: string, thread: string, data: string[]) => {
    consoleTransport(level, channel, thread, data);
    frontendLoggerTransport(level, channel, thread, data);
  },
);

const logger = log('uncaught');

window.onerror = function (message, source, lineno, colno, error) {
  logger.error(
    'Uncaught Exception:\n',
    message,
    source,
    `:${lineno}:${colno}\n`,
    error,
  );
};

window.onunhandledrejection = function (event: PromiseRejectionEvent) {
  const { reason } = event;
  if (reason instanceof Error) {
    logger.error('Unhandled Promise Rejection:\n', reason, reason.stack);
  } else {
    logger.error('Unhandled Promise Rejection:\n', reason);
  }
};
