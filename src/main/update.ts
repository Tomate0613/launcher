import { app, dialog, shell } from 'electron';
import { log } from '../common/logging/log';
import path from 'path';
import fs from 'node:fs/promises';

const logger = log('update');

type GithubUpdateConfig = {
  provider: 'github';
  owner: string;
  repo: string;
  releaseType?: 'draft' | 'release' | 'prerelease';
};

type GithubRelease = {
  tag_name: string;
  name: string | null;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
};

export async function checkForUpdates() {
  try {
    logger.log(process.env.UPDATE_DEBUG, process.env.UPDATE_DEBUG_ANY_RELEASE);
    if (!app.isPackaged && !process.env.UPDATE_DEBUG) {
      return;
    }

    logger.log('Checking for updates');

    const appUpdateConfigPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app-update.yml')
      : path.join(app.getAppPath(), 'dev-app-update.yml');

    const text = await fs.readFile(appUpdateConfigPath, 'utf8');

    const { parse } = await import('yaml');

    const config = parse(text) as GithubUpdateConfig;

    if (config.provider !== 'github') {
      logger.error(`Unsupported update provider: ${config.provider}`);
      return;
    }

    const { owner, repo } = config;

    if (typeof config.owner !== 'string' || typeof config.repo !== 'string') {
      throw new Error('Invalid GitHub update configuration');
    }

    const token = process.env.UPDATE_DEBUG_GITHUB_TOKEN;

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `GitHub API returned ${response.status} ${response.statusText}`,
      );
    }

    const releases = (await response.json()) as GithubRelease[];

    const release = releases.find((release) =>
      process.env.UPDATE_DEBUG_ANY_RELEASE
        ? true
        : !release.draft && !release.prerelease,
    );

    if (!release) {
      logger.log('No suitable release found');
      return;
    }

    const latestVersion = release.tag_name.replace(/^v/, '');
    const currentVersion = app.getVersion();

    if (latestVersion === currentVersion) {
      logger.log(`Already running latest version ${currentVersion}`);
      return;
    }

    logger.info(`Update available: ${currentVersion} to ${latestVersion}`);

    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Update available',
      message: `Launcher ${latestVersion} is available`,
      detail: `You are currently running version ${currentVersion}`,
      buttons: ['View release', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      await shell.openExternal(release.html_url);
    }
  } catch (error) {
    logger.error('Failed to check for updates', error);
  }
}
