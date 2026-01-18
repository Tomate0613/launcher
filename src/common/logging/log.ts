const LEVELS = ['verbose', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LEVELS)[number];

let TRANSPORTS: Transport[] = [] as const;
let THREAD: string;

type Transport = {
  transport: (
    level: LogLevel,
    channel: string,
    thread: string,
    data: unknown[],
  ) => void;
  level: LogLevel;
};

export class Logger {
  constructor(public channel: string) {}

  verbose(...data: unknown[]) {
    this.makeLog('verbose', data);
  }

  log(...data: unknown[]) {
    this.makeLog('info', data);
  }

  info(...data: unknown[]) {
    this.makeLog('info', data);
  }

  warn(...data: unknown[]) {
    this.makeLog('warn', data);
  }

  error(...data: unknown[]) {
    this.makeLog('error', data);
  }

  private makeLog(level: LogLevel, data: unknown[]) {
    transportLog(level, THREAD, this.channel, data);
  }

  private matchMcLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'verbose':
      case 'trace':
        return 'verbose';
      case 'info':
      case 'debug':
        return 'info';
      case 'warn':
        return 'warn';
      case 'error':
      case 'fatal':
        return 'error';
      default:
        console.warn('Unimplemented level', level);
        return 'info';
    }
  }
  mcLog(data: string) {
    if (data.length === 0) {
      return;
    }

    const firstChar = data[0];
    if (firstChar == '{') {
      try {
        const json = JSON.parse(data) as {
          logger: string;
          thread: string;
          level: string;
          message: string;
        };

        const level = this.matchMcLevel(json.level);

        transportLog(level, `Minecraft/${json.thread}`, json.logger, [
          json.message,
        ]);
        return;
      } catch {}
    }

    if (firstChar === '[') {
      const regex =
        /^\[\d{2}:\d{2}:\d{2}\]\s+\[(?<thread>[^/]+)\/(?<level>[^\]]+)\]:\s+(?<message>.+)$/;
      const match = data.match(regex);

      if (match && match.groups) {
        transportLog(
          this.matchMcLevel(match.groups.level),
          `Minecraft/${match.groups.thread}`,
          'Minecraft',
          [match.groups.message],
        );
        return;
      }
    }

    transportLog('error', 'Minecraft/unknown', 'no-parse', [data]);
  }
}

function transportLog(
  level: LogLevel,
  thread: string,
  channel: string,
  data: unknown[],
) {
  for (const transport of TRANSPORTS) {
    if (LEVELS.indexOf(transport.level) > LEVELS.indexOf(level)) {
      continue;
    }

    transport.transport(level, channel, thread, data);
  }
}

export function log(...channels: string[]) {
  return new Logger(channels.join(' '));
}

export function configureTransports(transports: Transport[], thread: string) {
  TRANSPORTS = transports;
  THREAD = thread;
}
