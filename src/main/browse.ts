import path from 'node:path';
import { defaultsPath, modpacksPath, skinCachePath, themesPath } from './paths';
import fs from 'node:fs/promises';
import nbt from 'prismarine-nbt';
import { log } from '../common/logging/log';
import { css, image, imageOrDelete, pathFileBuffer } from './utils';
import { clipboard, nativeImage, shell } from 'electron';

const logger = log('browse');

export async function getSkins() {
  const skins = await fs.readdir(skinCachePath);

  return (
    await Promise.all(
      skins.map(async (skin) => ({
        url: await imageOrDelete(path.join(skinCachePath, skin)),
        file: await pathFileBuffer(path.join(skinCachePath, skin)),
        id: skin,
      })),
    )
  ).filter(({ url }) => !!url) as {
    url: string;
    file: ArrayBuffer;
    id: string;
  }[];
}

export async function getThemes() {
  const themes = await fs.readdir(themesPath);

  return (
    await Promise.all(
      themes.map(async (theme) => {
        try {
          const data = JSON.parse(
            await fs.readFile(
              path.join(themesPath, theme, 'theme.json'),
              'utf8',
            ),
          );

          return {
            name:
              'name' in data && typeof data.name === 'string'
                ? (data.name as string)
                : 'Unamed',
            id: theme,
            url: await css(path.join(themesPath, theme, 'theme.css')),
          };
        } catch (e) {
          logger.warn(e);
          return null;
        }
      }),
    )
  ).filter((a) => a != null);
}

export async function getTheme(theme: string) {
  try {
    const a = await css(path.join(themesPath, theme, 'theme.css'));
    return a;
  } catch {
    return '';
  }
}

export function deleteSkin(id: string) {
  return fs.rm(path.join(skinCachePath, id));
}

export async function getScreenshots() {
  const modpacks = await fs.readdir(modpacksPath);

  const screenshots = await Promise.all(
    modpacks.map(async (modpack) => {
      const screenshotsPath = path.join(modpacksPath, modpack, 'screenshots');
      const screenshots = await fs
        .readdir(screenshotsPath)
        .catch(() => [] as string[]);
      return Promise.all(
        screenshots.map(async (screenshot) => {
          const screenshotPath = path.join(screenshotsPath, screenshot);
          return {
            modpack,
            screenshot,
            data: await image(screenshotPath),
            date: (await fs.stat(screenshotPath)).mtime.getTime(),
          };
        }),
      );
    }),
  );

  return screenshots.flat().sort((a, b) => b.date - a.date);
}

export async function copyScreenshot(modpack: string, screenshot: string) {
  const image = nativeImage.createFromPath(
    path.join(modpacksPath, modpack, 'screenshots', screenshot),
  );
  clipboard.writeImage(image);
}

export function showScreenshotInFileManager(
  modpack: string,
  screenshot: string,
) {
  shell.showItemInFolder(
    path.join(modpacksPath, modpack, 'screenshots', screenshot),
  );
}

export async function getWorlds() {
  const modpacks = await fs.readdir(modpacksPath);

  const worlds = await Promise.all(
    modpacks
      .map(async (modpack) => {
        const savesPath = path.join(modpacksPath, modpack, 'saves');
        const saves = await fs.readdir(savesPath).catch(() => [] as string[]);

        return (
          await Promise.all(
            saves.map(async (save) => {
              try {
                const savePath = path.join(savesPath, save);
                const levelDatPath = path.join(savePath, 'level.dat');

                const buffer = await fs.readFile(levelDatPath);
                const { parsed } = await nbt
                  .parse(buffer)
                  .catch(() => ({ parsed: { value: { Data: undefined } } }));

                if (!parsed.value.Data?.value) {
                  logger.error('Failed to parse world', savePath, parsed);
                  return null;
                }

                return {
                  modpack,
                  save,
                  name: (parsed.value.Data?.value as any).LevelName.value,
                  icon: await image(path.join(savePath, 'icon.png')),
                  date: (await fs.stat(savePath)).mtime.getTime(),
                  hardcore:
                    (parsed.value.Data?.value as any).hardcore.value !== 0,
                  version: (parsed.value.Data?.value as any).version.value,
                  gameType: (parsed.value.Data?.value as any).GameType.value,
                };
              } catch (e) {
                logger.warn('Ignoring world', save, 'because of error', e);
                return null;
              }
            }),
          )
        ).filter(Boolean);
      })
      .filter(Boolean),
  );

  return worlds
    .flat()
    .filter((a) => a != null)
    .sort((a, b) => b.date - a.date);
}

export function getDefaultFiles() {
  return fs.readdir(defaultsPath);
}

export function clearDefaultFile(file: string) {
  return fs.rm(path.join(defaultsPath, file), { recursive: true });
}
