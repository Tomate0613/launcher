import {
  checkDefaults as checkJavaFinderDefaults,
  checkPath as checkJavaFinderPath,
  FoundJavaInstallations,
} from '@doublekekse/find-java';
import { log } from '../../common/logging/log';
import {
  type JavaVersion,
  Launcher,
} from 'tomate-launcher-core';
import { error, FrontendError } from '../error';
import { javaInstallationsPath } from '../paths';

const logger = log('java');

const jdksOverriden = !!process.env.TOMATE_LAUNCHER_JDKS;
const javaInstallations = new FoundJavaInstallations();
if (jdksOverriden) {
  checkJavaFinderPath(javaInstallations, 'TOMATE_LAUNCHER_JDKS');
} else {
  checkJavaFinderDefaults(javaInstallations);
}

export function findJava(version: JavaVersion) {
  logger.log('Finding java', version);

  const javaPath = javaInstallations.get(version.majorVersion)?.[0];

  if (javaPath) {
    logger.log('Found', javaPath);

    if (process.platform == 'win32') {
      return javaPath.replace(/\.exe$/, 'w.exe');
    }

    return javaPath;
  }

  if (jdksOverriden) {
    throw new FrontendError(`Missing jdk ${version.majorVersion}`);
  }

  return undefined;
}

export async function javaTasks(version: JavaVersion, launcher: Launcher) {
  logger.log('Getting java version');

  const j = findJava(version);
  if (j) {
    return j;
  }

  try {
    return launcher.javaTasks(javaInstallationsPath, undefined, version);
  } catch (err) {
    throw error('Failed to download java', err);
  }
}
