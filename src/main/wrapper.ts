import net from 'node:net';
import cp from 'node:child_process';
import { log } from '../common/logging/log';
import { randomUUID } from 'node:crypto';
import {
  javaInstallationsPath,
  minecraftRootPath,
  sandboxPath,
  socketsStatePath,
} from './paths';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path, { dirname } from 'node:path';
import { runOnClose, withPlatformExtension } from './utils';
import { is } from '@electron-toolkit/utils';
import { Launcher, LaunchOptions } from 'tomate-launcher-core';
import { ProcessContext } from './process';
import { getSettings } from './data';
import { fileURLToPath } from 'node:url';

let socketsState: string[];

const logger = log('wrapper');

function getWrapperExecutable() {
  if (process.env.MC_WRAPPER_PATH) {
    return process.env.MC_WRAPPER_PATH;
  }

  if (is.dev) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    return path.join(
      __dirname,
      '../../extra-binaries',
      withPlatformExtension('mc-wrapper'),
    );
  }

  return path.join(
    process.resourcesPath,
    'bin',
    withPlatformExtension('mc-wrapper'),
  );
}

function socketPath(socketId: string) {
  if (process.platform === 'win32') {
    return `\\\\.\\pipe\\tomate-launcher-minecraft-wrapper-${socketId}.sock`;
  } else {
    return `${process.env.XDG_RUNTIME_DIR ?? '/tmp'}/tomate-launcher-minecraft-wrapper-${socketId}.sock`;
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
    '--game-executable',
    launchOptions.javaPath,
    '--game-args',
    JSON.stringify(await launcher.getLaunchArguments(launchOptions)),
    '--game-dir',
    launcher.options.root,
    '--minecraft-dir',
    minecraftRootPath,
    '--sandbox-dir',
    sandboxPath,
  ];

  const jdksOverriden = !!process.env.TOMATE_LAUNCHER_JDKS;
  if (!jdksOverriden) {
    wrapperArgs.push('--launcher-java-dir', javaInstallationsPath);
  }

  if (getSettings().wrapper.reopen) {
    wrapperArgs.push(
      '--launcher-executable',
      process.execPath,
      '--launcher-args',
      JSON.stringify(process.argv.slice(1)),
    );
  }

  const wrapper = getWrapperExecutable();

  const wrapperDebug = process.env.MC_WRAPPER_DEBUG;

  const child = cp.spawn(wrapper, wrapperArgs, {
    detached: true,
    stdio: wrapperDebug ? 'pipe' : 'ignore',
  });

  if (wrapperDebug) {
    child.stdout?.on('data', (m) => logger.log(m.toString('utf8')));
    child.stderr?.on('data', (m) => logger.error(m.toString('utf8')));
  }

  child.on('exit', (code) => {
    logger.log('Wrapper exited', code);
    launcher.emit('close', code);
  });

  child.unref();

  logger.log(process.execPath, JSON.stringify(process.argv.slice(1)));

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
