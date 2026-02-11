import { Modpack } from './data/modpack';
import { Account } from './data/account';
import { accountsPath, modpacksPath } from './paths';
import fs from 'node:fs';
import { Settings } from './data/settings';
import { writeLog4jConfig } from './static/log4jConfig';
import { log } from '../common/logging/log';
import { SyncedIdSet } from '../common/synced/synced-id-set/backend';
import { writeDefaultThemes } from './static/defaultThemes';

const logger = log('data');

export let modpacks: SyncedIdSet<Modpack>;
export let accounts: SyncedIdSet<Account>;

let settings: Settings | undefined;

function unless<Value>(something: Value | false): something is Value {
  return something !== false;
}

let isLoaded = false;

export function loadData() {
  if (isLoaded) {
    return;
  }

  isLoaded = true;
  logger.log('Loading data');

  writeLog4jConfig();
  writeDefaultThemes();

  const modpackList = fs.existsSync(modpacksPath)
    ? fs
        .readdirSync(modpacksPath)
        .map((path) => {
          try {
            return Modpack.load(path);
          } catch (err) {
            logger.error(`Failed to load modpack ${path} (${err})`);
            return false;
          }
        })
        .filter(unless)
    : [];

  modpacks = SyncedIdSet.ofClassList('modpacks', modpackList);
  if (!fs.existsSync(accountsPath)) {
    fs.writeFileSync(accountsPath, '[]');
  }

  settings = Settings.load();

  const accountData = fs.readFileSync(accountsPath, 'utf8');
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
  logger.log('Done loading data');
}

function onClose() {
  logger.log('Closed');
  modpacks.forEach((modpack) => modpack.onClose());
  settings?.save();

  const data = accounts.values().map((account) => JSON.stringify(account));

  fs.writeFileSync(accountsPath, JSON.stringify(Array.from(data)));
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
    throw new Error('Settings have not been initialized yet');
  }

  return settings;
}

process.on('SIGTERM', onClose);
process.on('exit', onClose);
