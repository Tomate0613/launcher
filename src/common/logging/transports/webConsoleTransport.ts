import type { LogLevel } from '../log';

export function consoleTransport(
  level: LogLevel,
  channel: string,
  thread: string,
  data: unknown[],
) {
  const time = new Date().toLocaleTimeString();

  const levelStyles: Record<LogLevel, string> = {
    verbose: 'color: grey',
    info: 'color: oklch(75% 0.125 150deg)',
    warn: 'color: oklch(75% 0.125 60deg)',
    error: 'color: oklch(75% 0.125 25deg)',
  };

  console[level === 'verbose' ? 'debug' : level](
    `%c[${time}] %c[${thread}/${level}] %c(${channel})`,
    'color: oklch(75% 0.125 245deg)',
    levelStyles[level],
    'color: oklch(75% 0.125 300deg)',
    ...data,
  );
}
