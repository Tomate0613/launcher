import { liner } from 'tomate-loaders';
import { Modpack } from '../modpack';
import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { log } from '../../../common/logging/log';
import { Launcher } from 'tomate-launcher-core';
import { javaTasks } from '../java';
import { unsupPath } from '../../paths';
import path from 'node:path';

const logger = log('sync');

function wrapProcess(child: ChildProcessWithoutNullStreams) {
  return new Promise<void>((resolve, reject) => {
    child.stdout.on(
      'data',
      liner((line) => logger.log(line)),
    );

    child.stderr.on(
      'data',
      liner((line) => logger.error(line)),
    );

    child.on('close', (code) => {
      logger.log('Sync stopped with code', code);
      if (code == 0) {
        resolve();
        return;
      }

      reject();
    });
  });
}

export async function syncModpack(modpack: Modpack, launcher: Launcher) {
  const { sync } = modpack;

  if (!sync) {
    return;
  }

  if (sync.type === 'external') {
    return () => {
      if (!sync.command) {
        return;
      }

      return wrapProcess(
        spawn(sync.command, {
          shell: true,
          cwd: modpack.dir,
        }),
      );
    };
  }

  if (sync.type === 'unsup') {
    const unsupVersion = {
      version: '1.2.0',
      sha1: 'fa0aa0f54fd8d926e86d7243442278e5e7e998f6',
    };

    const java25 = await javaTasks(
      {
        component: 'java-runtime-epsilon',
        majorVersion: 25,
      },
      launcher,
    );

    const unsupJarPath = path.join(
      unsupPath,
      `unsup-${unsupVersion.version}.jar`,
    );

    launcher.tasks.file(
      `https://repo.sleeping.town/com/unascribed/unsup/${unsupVersion.version}/unsup-${unsupVersion.version}.jar`,
      unsupJarPath,
      unsupVersion.sha1,
      942187,
      'other',
    );

    return () => {
      return wrapProcess(
        spawn(
          java25,
          ['-Dunsup.guiInStandalone=true', '-jar', unsupJarPath, 'client'],
          { cwd: modpack.dir },
        ),
      );
    };
  }

  throw new Error(`Invalid sync "${sync}"`);
}
