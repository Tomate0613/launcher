import path from 'path';
import { LogLevel } from '../log';
import fs, { WriteStream } from 'fs';
import { logsPath } from '../../../main/paths';
import { inspect } from 'util';
import { accounts } from '../../../main/data';
import { ensureDirectoryExists } from '../../../main/utils';

let file: WriteStream;

export function fileTransport(
  level: LogLevel,
  channel: string,
  thread: string,
  data: unknown[],
) {
  if (!file) {
    file = createFile();
    file.write(`=========== ${new Date().toString()} ===========\n`);
  }

  let cData = data
    .map((o) => (typeof o === 'object' ? inspect(o) : o))
    .join(' ');

  for (const account of accounts?.values() || []) {
    cData = account.sanitize(cData);
  }

  const line = format(channel, level, thread) + ' ' + cData;

  file.write(line + '\n');
}

function createFile() {
  ensureDirectoryExists(logsPath);

  var filePath = path.join(logsPath, 'latest.log');
  return fs.createWriteStream(filePath);
}

export function format(channel: string, level: LogLevel, thread: string) {
  const date = new Date();

  const cDate = `[${date.toLocaleTimeString()}]`;
  const cLevel = `[${thread}/${level}]`;
  const cChannel = `(${channel})`;

  return `${cDate} ${cLevel} ${cChannel}`;
}
