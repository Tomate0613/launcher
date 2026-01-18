/// <reference path="../../../preload/globals.d.ts" />
import type { LogLevel } from '../log';

export async function ipcRendererTransport(
  level: LogLevel,
  channel: string,
  thread: string,
  data: unknown[],
) {
  window.log(level, channel, thread, data);
}
