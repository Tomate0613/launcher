import fsSync, { promises as fs } from 'node:fs';
import path from 'node:path';
import { tempPaths } from './paths';
import { app } from 'electron';
import { downloadManager } from './data/downloads';

export const noop = () => {};

/**
 * Ensures that a directory exists, creates it if it doesn't
 */
export function ensureDirectoryExists(directoryPath: string) {
  if (!fsSync.existsSync(directoryPath)) {
    fsSync.mkdirSync(directoryPath, { recursive: true });
  }
}

/**
 * Removes the directory and its contents if it exists
 */
export function cleanDirectory(directoryPath: string) {
  if (fsSync.existsSync(directoryPath)) {
    fsSync.rmSync(directoryPath, { recursive: true });
  }
}

/**
 * Removes the directory if it is empty
 */
export function deleteDirectoryIfEmpty(directoryPath: string) {
  if (
    fsSync.existsSync(directoryPath) &&
    fsSync.statSync(directoryPath).isDirectory() &&
    fsSync.readdirSync(directoryPath).length == 0
  ) {
    fsSync.rmSync(directoryPath, { recursive: true });
  }
}

export async function downloadFileFromUrl(
  url: string,
  filePath: string,
  sha1hash?: string,
): Promise<void> {
  return downloadManager.download({
    url,
    outputPath: filePath,
    hash: sha1hash,
    type: 'other',
  });
}

export function tempPath(name = 'tmp') {
  ensureDirectoryExists(tempPaths);

  let prefix = 1;
  let filepath = path.join(tempPaths, name);

  while (fsSync.existsSync(filepath)) {
    prefix++;
    filepath = path.join(tempPaths, `${prefix}-${name}`);
  }

  return filepath;
}

export async function retry<T>(
  fn: () => T,
  err: (error: unknown) => void,
  count: number,
): Promise<T> {
  for (let i = 0; i < count; i++) {
    try {
      return await fn();
    } catch (e) {
      err(e);
    }
  }

  throw new Error();
}

export function fileBufferPath(buffer: ArrayBuffer, name = 'tmp') {
  const tempFilePath = tempPath(name);

  const nodeBuffer = Buffer.from(buffer);
  fsSync.writeFileSync(tempFilePath, nodeBuffer);

  return tempFilePath;
}

export async function pathFileBuffer(filePath: string) {
  const buffer = await fs.readFile(filePath);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
}

export async function imageOrDelete(imgPath: string) {
  const ret = image(imgPath);
  if (ret) {
    return ret;
  }

  await fs.rm(imgPath);
  return undefined;
}

export function css(imgPath: string) {
  return file(imgPath, 'text/css');
}

async function file(filePath: string, type: string) {
  if (app.isPackaged) {
    try {
      const t = (await fs.stat(filePath)).mtime.getTime();
      return `file://${filePath}?${t}`;
    } catch {
      return undefined;
    }
  }

  return fs
    .readFile(filePath)
    .then((a) => `data:${type};base64,${a.toString('base64')}`)
    .catch(() => undefined);
}

function fileSync(filePath: string, type: string) {
  if (!fsSync.existsSync(filePath)) {
    return undefined;
  }

  if (app.isPackaged) {
    return `file://${filePath}`;
  }

  try {
    const data = fsSync.readFileSync(filePath).toString('base64');
    return `data:${type};base64,${data}`;
  } catch {
    return undefined;
  }
}

export function image(imgPath: string) {
  return file(imgPath, 'image/png');
}

export function imageSync(imgPath: string) {
  return fileSync(imgPath, 'image/png');
}

export function safeJoin(baseDir: string, unsafePath: string): string {
  const targetPath = path.resolve(baseDir, unsafePath);

  if (!targetPath.startsWith(path.resolve(baseDir) + path.sep)) {
    throw new Error(`Invalid path: ${unsafePath}`);
  }

  return targetPath;
}
