import fsSync, { promises as fs } from 'node:fs';
import path from 'node:path';
import { basePath, tempPaths } from './paths';
import { shell } from 'electron';
import { log } from '../common/logging/log';

const logger = log('utils');

export const noop = () => {};

/**
 * Ensures that a directory exists, creates it if it doesn't
 */
export function ensureDirectoryExistsSync(directoryPath: string) {
  if (!fsSync.existsSync(directoryPath)) {
    fsSync.mkdirSync(directoryPath, { recursive: true });
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

/**
 * Copy all files from first directory to second directory
 * In case of duplicates will be renamed automatically
 */
export function copyFilesWithRename(srcDir: string, destDir: string) {
  ensureDirectoryExistsSync(destDir);

  if (!fsSync.existsSync(srcDir)) {
    return;
  }

  const files = fsSync.readdirSync(srcDir);

  files.forEach((file) => {
    const srcPath = path.join(srcDir, file);
    let destPath = path.join(destDir, file);

    if (fsSync.existsSync(destPath)) {
      const ext = path.extname(file);
      const name = path.basename(file, ext);
      let counter = 1;

      while (fsSync.existsSync(destPath)) {
        destPath = path.join(destDir, `${name} (${counter})${ext}`);
        counter++;
      }
    }

    fsSync.copyFileSync(srcPath, destPath);
    logger.log(`Copied ${srcPath} to ${destPath}`);
  });
}

export function safeFilename(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 20);
}

export function escapeDesktopValue(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

export async function downloadFileFromUrl(
  url: string,
  filePath: string,
  sha1hash?: string,
): Promise<void> {
  return (await import('./data/downloads')).downloadManager.download({
    url,
    outputPath: filePath,
    hash: sha1hash,
    type: 'other',
  });
}

export function tempPath(name = 'tmp') {
  ensureDirectoryExistsSync(tempPaths);

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

export async function localFile(filePath: string) {
  try {
    const t = (await fs.stat(filePath)).mtime.getTime();
    return `local://${path.relative(basePath, filePath)}?${t}`;
  } catch {
    return undefined;
  }
}

export function localFileUnchecked(filePath: string) {
  return `local://${path.relative(basePath, filePath)}`;
}

export function localFileSync(filePath: string) {
  try {
    const t = fsSync.statSync(filePath).mtime.getTime();

    return `local://${path
      .relative(basePath, filePath)
      .split(path.sep)
      .join('/')}?${t}`;
  } catch {
    return undefined;
  }
}

export function safeJoin(baseDir: string, unsafePath: string): string {
  const targetPath = path.resolve(baseDir, unsafePath);

  if (!targetPath.startsWith(path.resolve(baseDir) + path.sep)) {
    throw new Error(`Invalid path: ${unsafePath}`);
  }

  return targetPath;
}

export function runOnClose(callback: () => void) {
  process.on('SIGTERM', callback);
  process.on('exit', callback);
}

export function withPlatformExtension(name: string) {
  const ext = process.platform === 'win32' ? '.exe' : '';

  return `${name}${ext}`;
}

/**
 * Checks for https:// and then opens in browser
 */
export function openInBrowser(url: string) {
  if (url.startsWith('https://')) {
    logger.log('Opening in browser', url);
    shell.openExternal(url);
    return true;
  }

  logger.error(`Unsupported protocol. Did not open ${url} in browser`);
  return false;
}
