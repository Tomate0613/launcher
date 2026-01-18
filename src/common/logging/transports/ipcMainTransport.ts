import { inspect } from 'node:util';
import type { LogLevel } from '../log';
import { invoke } from '../../../main/api';

export async function ipcMainTransport(
  level: LogLevel,
  channel: string,
  thread: string,
  data: unknown[],
) {
  invoke(
    'log',
    level,
    channel,
    thread,
    data.map((o) => (typeof o === 'object' ? inspect(o) : o)),
  );
}
