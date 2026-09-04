import { Modpack } from './data/modpack';
import { Account } from './data/account';
import { accountsPath, modpacksPath } from './paths';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import { Settings } from './data/settings';
import { writeLog4jConfig } from './static/log4jConfig';
import { log } from '../common/logging/log';
import { SyncedIdSet } from '../common/synced/synced-id-set/backend';
import { writeDefaultThemes } from './static/defaultThemes';
import { runOnClose } from './utils';
import { Tokens } from './data/tokens';
import { State } from './data/state';

const logger = log('data');

export const modpacks = SyncedIdSet.ofClassList<Modpack>('modpacks', []);
export let accounts: SyncedIdSet<Account>;

let settings: Settings | undefined;
let tokens: Tokens | undefined;
let state: State | undefined;

function unless<Value>(something: Value | false): something is Value {
  return something !== false;
}

let isLoaded = false;

async function loadModpacks() {
  try {
    const paths = await fs.readdir(modpacksPath);

    (
      await Promise.all(
        paths.map((path) =>
          Modpack.load(path).catch((err) => {
            logger.error(`Failed to load modpack ${path} (${err})`);
            return false as const;
          }),
        ),
      )
    )
      .filter(unless)
      .forEach((modpack) => modpacks.push(modpack));

    logger.log('All modpacks loaded')
  } catch {
    logger.warn('Could not read modpacks directory');
  }
}

function loadAccounts() {
  if (!fsSync.existsSync(accountsPath)) {
    fsSync.writeFileSync(accountsPath, '[]');
  }

  const accountData = fsSync.readFileSync(accountsPath, 'utf8');
  const accountList = JSON.parse(accountData).map((accountJSON: string) => {
    const account = Account.fromJSON(accountJSON, Account);
    try {
      if (account.type === 'msa') {
        account.loadExisting();
      }
    } catch (e) {
      logger.error('Failed to load account', e);
    }

    return account;
  });
  accounts = SyncedIdSet.ofClassList('accounts', accountList);
}

export async function loadData() {
  if (isLoaded) {
    return;
  }

  isLoaded = true;
  logger.log('Loading data');

  writeLog4jConfig();
  writeDefaultThemes();

  loadModpacks();

  settings = Settings.load();
  tokens = Tokens.load();
  tokens.apply();
  state = await State.load();

  loadAccounts();

  logger.log('Done loading data');
}

function onClose() {
  logger.log('Saving');
  modpacks.forEach((modpack) => modpack.onLauncherClose());
  settings?.save();
  tokens?.save();

  const data = accounts.values().map((account) => JSON.stringify(account));

  fsSync.writeFileSync(accountsPath, JSON.stringify(Array.from(data)));
  logger.log('Closed');
}

export function getModpack(modpackId: string) {
  const modpack = modpacks.get(modpackId);

  if (!modpack) throw new Error(`Modpack ${modpackId} could not be found`);

  return modpack;
}

export function getAccount(accountId: string) {
  const account = accounts.get(accountId);

  if (!account) throw new Error(`Account ${accountId} could not be found`);

  return account;
}

export function getSettings() {
  if (!settings) {
    throw new Error('Settings have not been loaded yet');
  }

  return settings;
}

export function getState() {
  if (!state) {
    throw new Error('State has not been loaded yet');
  }

  return state;
}

export function getTokens() {
  if (!tokens) {
    throw new Error('Tokens have not been loaded yet');
  }

  return tokens;
}

export function getVisibleModpacks() {
  return modpacks.values().filter((m) => !m.isDeleted);
}

runOnClose(onClose);
