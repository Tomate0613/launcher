import yargs, { type Argv } from 'yargs';
import { log } from '../common/logging/log';
import { getAccount, getSettings, modpacks } from './data';
import { Modpack } from './data/modpack';
import { prepare } from '.';
import { app } from 'electron';
import { noop } from './utils';
import { isProviderEnabled } from './data/content/lib';

const logger = log('cli');

export function parseArgs(argv: string[]) {
  logger.log(argv);
  args(yargs(argv)).parse();
}

function args(yargs: Argv) {
  return yargs
    .command(
      'launch <modpack-id>',
      'launch a modpack',
      (yargs) => {
        return yargs.positional('modpack-id', {
          describe: 'Id of the modpack to launch',
          demandOption: true,
          type: 'string',
        });
      },
      (argv) => {
        prepare();

        const modpack = modpacks.get(argv.modpackId);

        if (!modpack) {
          return error(`Modpack '${argv.modpackId}' does not exist`);
        }

        launch(modpack);
      },
    )
    .command('list-modpacks', 'List all modpacks', noop, () => {
      prepare();

      modpacks.forEach((modpack) => {
        logger.log(modpack.name, modpack.id);
      });

      app.exit(0);
    })
    .command(
      'create-modpack <name> <loader> <game-version>',
      'Create a new modpack',
      (yargs) => {
        return yargs
          .positional('name', {
            describe: 'Name of the modpack',
            demandOption: true,
            type: 'string',
          })
          .positional('loader', {
            describe: 'Loader',
            demandOption: true,
            type: 'string',
            choices: ['vanilla', 'fabric', 'forge', 'neoforge', 'quilt'],
          })
          .positional('game-version', {
            describe: 'Game Version',
            demandOption: true,
            type: 'string',
          })
          .option('mr', { type: 'string', array: true, default: [] })
          .option('cf', { type: 'string', array: true, default: [] })
          .option('file', { type: 'string', array: true, default: [] });
      },
      async (argv) => {
        prepare();

        logger.log(argv);

        const modpack = await create(argv, argv.name);
        logger.log('Created modpack', `"${modpack.name}"`);

        app.exit(0);
      },
    )
    .command(
      'quick-launch <loader> <game-version>',
      'Launch the game using a temporary modpack deleted on exit',
      (yargs) => {
        return yargs
          .positional('loader', {
            describe: 'Loader',
            demandOption: true,
            type: 'string',
            choices: ['vanilla', 'fabric', 'forge', 'neoforge', 'quilt'],
          })
          .positional('game-version', {
            describe: 'Game Version',
            demandOption: true,
            type: 'string',
          })
          .option('mr', { type: 'string', array: true, default: [] })
          .option('cf', { type: 'string', array: true, default: [] })
          .option('file', { type: 'string', array: true, default: [] });
      },
      async (argv) => {
        prepare();

        const modpack = await create(argv, 'quick-launch');
        modpack.delete(); // Mark as deleted

        launch(modpack);
      },
    );
}

async function create(
  args: {
    loader: string;
    gameVersion: string;
    mr: string[];
    cf: string[];
    file: string[];
  },
  name: string,
) {
  const { mr, cf, file, loader } = args;
  const gameVersion = args.gameVersion;

  if (!gameVersion) {
    throw new Error('no game version specified');
  }

  const modpack = new Modpack(name, gameVersion, {
    id: loader as never,
  });
  modpacks.push(modpack);

  // TODO detect project type
  const mrs = mr.map((mod) =>
    modpack.modsContent.installLatest('modrinth', mod, 'local'),
  );

  let cfs: Promise<string>[] = [];
  if (cf.length) {
    const curseforge = 'curseforge' as const;

    if (!isProviderEnabled(curseforge)) {
      throw new Error('Curseforge support is not enabled');
    }
    cfs = cf.map((mod: string) =>
      modpack.modsContent.installLatest(curseforge, mod, 'local'),
    );
  }

  const files = file.map((mod: string) => modpack.modsContent.import(mod));

  logger.log(await Promise.all(mrs));
  logger.log(await Promise.all(cfs));
  logger.log(await Promise.all(files));

  modpack.save();
  return modpack;
}

async function launch(modpack: Modpack) {
  const launcher = await modpack.launch(
    getAccount(getSettings().activeAccountId!),
  );

  launcher.on('close', (code) => {
    setTimeout(() => {
      app.exit(code ?? 0);
    }, 1000);
  });
}

function error(...data: unknown[]) {
  logger.error(...data);
  app.exit(0);
}
