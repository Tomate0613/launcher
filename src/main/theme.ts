import fs from 'node:fs/promises';
import path from 'node:path';
import { themesPath } from './paths';
import { getSettings } from './data';
import { log } from '../common/logging/log';

const logger = log('theme');

export type ThemeManifest = {
  name: string;
  background?: string;
};

const defaultTheme: ThemeManifest = {
  name: 'default',
};

export async function getThemeManifest(): Promise<ThemeManifest> {
  const theme = getSettings().theme;

  if (theme === 'default') {
    return defaultTheme;
  }

  try {
    const json = await fs.readFile(
      path.join(themesPath, theme, 'theme.json'),
      'utf8',
    );
    return JSON.parse(json);
  } catch {}

  logger.warn(
    `Theme ${theme} missing manifest. Falling back to default manifest`,
  );
  return defaultTheme;
}
