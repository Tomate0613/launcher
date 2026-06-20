import fs from 'node:fs/promises';
import { storePath } from '../../paths';
import path from 'node:path';
import { log } from '../../../common/logging/log';
import crypto from 'node:crypto';
import { getSettings } from '../../data';

const logger = log('content-store');
const locks: Map<string, Promise<unknown>> = new Map();

async function getHash(filePath: string) {
  const file = await fs.readFile(filePath);
  return crypto.createHash('sha1').update(file).digest('hex');
}

async function locked<T>(key: string, func: () => Promise<T>) {
  const lock = locks.get(key);
  if (lock) {
    await lock;
  }

  const promise = (async () => {
    let value: T;
    try {
      value = await func();
    } finally {
      locks.delete(key);
    }

    return value;
  })();

  locks.set(key, promise);
  return promise;
}

export async function wrapDownload(
  sha1: string | undefined,
  targetPath: string,
  func: (path: string) => Promise<void>,
) {
  if (!sha1) {
    const tmpPath = targetPath + '.tmp';
    await func(tmpPath);
    return fs.rename(tmpPath, targetPath);
  }

  const storeItemPath = path.join(storePath, sha1);

  await locked(sha1, async () => {
    try {
      await fs.access(storeItemPath);
    } catch {
      const tmpPath = storeItemPath + '.tmp';
      await func(tmpPath);
      await fs.rename(tmpPath, storeItemPath);
      await fs.chmod(storeItemPath, 0o444);
    }
  });

  await fs.rm(targetPath, { force: true });
  return fs.link(path.resolve(storeItemPath), path.resolve(targetPath));
}

export async function registerInStore(filePath: string) {
  if ((await fs.stat(filePath)).nlink !== 1) {
    return;
  }

  const sha1 = await getHash(filePath);
  const storeItemPath = path.join(storePath, sha1);

  try {
    await fs.access(storeItemPath);
    await fs.rm(filePath, { force: true });
    return fs.link(path.resolve(storeItemPath), path.resolve(filePath));
  } catch {}

  return fs.link(path.resolve(filePath), path.resolve(storeItemPath));
}

export async function gcStore() {
  logger.log('Running gc');
  getSettings().storeGcLastRunDate = Date.now();

  const storeItems = await fs.readdir(storePath);

  for (const storeItem of storeItems) {
    const storeItemPath = path.join(storePath, storeItem);

    await locked(storeItem, async () => {
      const stat = await fs.stat(storeItemPath);

      if (stat.nlink === 1) {
        logger.log(`Clearing store item ${storeItem}`);
        await fs.rm(storeItemPath);
      }
    });
  }
}

export async function validateStore() {
  logger.log('Validating store');
  const storeItems = await fs.readdir(storePath);

  const count = (
    await Promise.all(
      storeItems.map(async (storeItem) => {
        const storeItemPath = path.join(storePath, storeItem);

        return await locked(storeItem, async () => {
          const sha1 = await getHash(storeItemPath);

          if (sha1 !== storeItem) {
            logger.log(
              'Broken store file',
              storeItem,
              'should have hash',
              sha1,
            );
            return 1;
          }

          return 0;
        });
      }),
    )
  ).reduce<number>((a, b) => a + b, 0);

  logger.log('Validated store,', count, 'broken files found');
}

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

export async function storeSchedules() {
  const now = Date.now();

  if (
    now - getSettings().storeGcLastRunDate > ONE_WEEK &&
    getSettings().store.gcSchedule === 'weekly'
  ) {
    await gcStore();
  }
}
