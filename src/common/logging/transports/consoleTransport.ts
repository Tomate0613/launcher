import { LogLevel } from '../log';
import c from 'ansi-colors';

export function consoleTransport(
  level: LogLevel,
  channel: string,
  thread: string,
  data: unknown[],
) {
  if (level === 'verbose') {
    return console.debug(format(channel, level, thread), ...data);
  }

  if (level === 'info') {
    return console.info(format(channel, level, thread), ...data);
  }

  if (level === 'warn') {
    return console.warn(format(channel, level, thread), ...data);
  }

  if (level === 'error') {
    return console.error(format(channel, level, thread), ...data);
  }

  throw new Error(`consoleTransport does not support level "${level}"`);
}

function formatLevel(level: LogLevel, thread: string) {
  const text = `[${thread}/${level}]`;

  switch (level) {
    case 'warn':
      return c.yellow(text);
    case 'info':
      return c.green(text);
    case 'error':
      return c.red(text);
    case 'verbose':
      return c.grey(text);
  }
}

export function format(channel: string, level: LogLevel, thread: string) {
  const date = new Date();

  const cDate = c.blue(`[${date.toLocaleTimeString()}]`);
  const cLevel = formatLevel(level, thread);
  const cChannel = c.cyan(`(${channel})`);

  return `${cDate} ${cLevel} ${cChannel}`;
}
