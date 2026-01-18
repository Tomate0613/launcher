import { LogLevel } from '../log';

export function frontendLoggerTransport(
  level: LogLevel,
  channel: string,
  thread: string,
  data: unknown[],
) {
  logs.push({
    line: data.join(' ').replaceAll(' ', '\xa0'),
    level,
    channel,
    thread,
    timestamp: new Date().toLocaleTimeString(),
  });
}

export function clearLogs() {
  logs = [];
}

export let logs: FrontendLogData[] = [];
export type FrontendLogData = {
  level: LogLevel;
  channel: string;
  thread: string;
  line: string;
  timestamp: string;
};
