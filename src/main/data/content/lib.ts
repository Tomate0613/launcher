/// <reference path="../../env.d.ts" />
import {
  CurseforgeProvider,
  ImplementedProvider,
  ModrinthProvider,
  TomateMods,
} from 'tomate-mods';

const curseforgeEnabled = false;

export function isProviderEnabled(
  provider: ImplementedProvider,
): provider is EnabledProvider {
  if (provider === 'modrinth') {
    return true;
  }

  return curseforgeEnabled;
}

export type EnabledProviderIds = typeof curseforgeEnabled extends true
  ? ['modrinth', 'curseforge']
  : ['modrinth'];

export type EnabledProvider = EnabledProviderIds[number];

type EnabledProviders = typeof curseforgeEnabled extends true
  ? [CurseforgeProvider, ModrinthProvider]
  : [ModrinthProvider];

export const enabledProviders = (curseforgeEnabled
  ? ['curseforge', 'modrinth']
  : ['modrinth']) as unknown as EnabledProviderIds;

const userAgent = 'Tomate0613/launcher/1.0.0';

export const tomateMods = (curseforgeEnabled
  ? TomateMods.fromProviders(
      new ModrinthProvider(userAgent),
      new CurseforgeProvider(userAgent, __CURSEFORGE_API_KEY__),
    )
  : TomateMods.fromProviders(
      new ModrinthProvider(userAgent),
    )) as unknown as TomateMods<EnabledProviders>;
