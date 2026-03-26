import net from 'node:net';
import cp from 'node:child_process';
import { log } from '../common/logging/log';
import { randomUUID } from 'node:crypto';
import { socketsStatePath } from './paths';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { runOnClose } from './utils';
import { is } from '@electron-toolkit/utils';
import { Launcher, LaunchOptions } from 'tomate-launcher-core';
import { ProcessContext } from './process';

let socketsState: string[];

const logger = log('wrapper');

function getWrapperExecutable() {
  if (process.env.MC_WRAPPER_PATH) {
    return process.env.MC_WRAPPER_PATH;
  }

  const ext = process.platform === 'win32' ? '.exe' : '';

  if (is.dev) {
    return path.join(__dirname, '../../extra-binaries', `mc-wrapper${ext}`);
  }

  return path.join(process.resourcesPath, 'bin', `mc-wrapper${ext}`);
}

function socketPath(socketId: string) {
  if (process.platform === 'win32') {
    return `\\\\.\\pipe\\tomate-launcher-minecraft-wrapper-${socketId}.sock`;
  } else {
    return `/tmp/tomate-launcher-minecraft-wrapper-${socketId}.sock`;
  }
}

function connectSocket(socketId: string, onResourceManagerLoaded?: () => void) {
  const client = net.createConnection(socketPath(socketId), () => {
    logger.log('Connected to socket');
  });

  let buffer = '';
  client.on('data', (chunk) => {
    buffer += chunk.toString();

    let lines = buffer.split('\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      if (line.trim() === '') continue;
      try {
        const json = JSON.parse(line);

        if (json.type === 'line') {
          if (onResourceManagerLoaded) {
            if (json.data.data.includes('Reloading ResourceManager')) {
              onResourceManagerLoaded();
            }
          }
          mcLog(json.data);
        } else if (json.type === 'lines') {
          for (const lineData of json.data) {
            mcLog(lineData);
          }
        } else {
          logger.log('Received:', json);
        }
      } catch (e) {
        logger.error('Failed to parse JSON:', e, line);
      }
    }
  });

  client.on('end', () => {
    logger.log('Disconnected from socket');
    socketsState = socketsState.filter((s) => s !== socketId);
  });

  client.on('error', (err) => {
    logger.error('Socket error:', err);
    client?.end();
    socketsState = socketsState.filter((s) => s !== socketId);
  });
}

export async function spawnWrapper(
  launcher: Launcher,
  launchOptions: LaunchOptions & { javaPath: string },
  ctx: ProcessContext,
) {
  logger.log('Spawning mc-wrapper');
  const id = randomUUID();

  const wrapperArgs = [
    '--instance-id',
    id,
    '--launcher-executable',
    process.execPath,
    '--launcher-args',
    JSON.stringify(process.argv.slice(1)),
    '--game-executable',
    launchOptions.javaPath,
    '--game-args',
    JSON.stringify(await launcher.getLaunchArguments(launchOptions)),
    '--game-cwd',
    launcher.options.root,
  ];

  logger.log(JSON.stringify(wrapperArgs));

  const wrapper = getWrapperExecutable();

  logger.log(wrapper);

  const child = cp.spawn(wrapper, wrapperArgs, {
    detached: true,
    stdio: 'ignore',
  });

  // TODO: This means the wrapper needs to also exit with the code the game exits
  child.on('exit', (code) => {
    launcher.emit('close', code);
  });

  child.unref();

  logger.log(process.execPath, JSON.stringify(process.argv.slice(1)));
  logger.log(child);

  child.exitCode;

  socketsState.push(id);

  setTimeout(() => {
    connectSocket(id, () => {
      ctx.done();
    });
  }, 1000);
}

function tryReattach(id: string) {
  connectSocket(id);
}

export async function tryReattachSockets() {
  try {
    socketsState = JSON.parse(await fs.readFile(socketsStatePath, 'utf8'));
    if (!Array.isArray(socketsState)) {
      logger.warn('sockets state is not an array: "', socketsState, '"');
      socketsState = [];
    }
  } catch {
    socketsState = [];
  }

  for (const socket of socketsState) {
    tryReattach(socket);
  }
}

function mcLog(lineData: any) {
  if (lineData.type === 'stdout') {
    logger.mcLog(lineData.data);
  } else {
    logger.mcLogError(lineData.data);
  }
}

runOnClose(() => {
  fsSync.writeFileSync(socketsStatePath, JSON.stringify(socketsState));
});
