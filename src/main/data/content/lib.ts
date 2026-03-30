/// <reference path="../../env.d.ts" />
import { ModrinthProvider, TomateMods } from 'tomate-mods';

const userAgent = 'Tomate0613/launcher/1.0.0';

export const tomateMods = TomateMods.fromProvidersDynamic(
  new ModrinthProvider(userAgent),
);
