import type { AccountFrontendData } from '../../../main/data/account';
import { computed, reactive, ref, watch } from 'vue';
import { createGlobalState } from '@vueuse/core';
import { SyncedIdSet } from '../../../common/synced/synced-id-set/frontend';
import { ModpackFrontendData } from '../../../main/data/modpack';
import { log } from '../../../common/logging/log';

const logger = log('app-state');

export const useAppState = createGlobalState(async () => {
  logger.log('Created new app state');

  window.addEventListener(
    'beforeunload',
    () => {
      accounts.value?.cleanup();
      modpacks.value?.cleanup();
      modpacks.value = null as never;
      accounts.value = null as never;
    },
    { once: true },
  );

  // if (import.meta.hot) {
  //   window.addEventListener(
  //     'vite:beforeUpdate',
  //     () => {
  //       accounts.value?.cleanup();
  //       modpacks.value?.cleanup();
  //       modpacks.value = null;
  //       accounts.value = null;
  //     },
  //     { once: true },
  //   );
  // }

  const accounts = ref(
    await SyncedIdSet.ofSynced<AccountFrontendData>('accounts'),
  );
  const modpacks = ref(
    await SyncedIdSet.ofSynced<ModpackFrontendData>('modpacks'),
  );
  const accountId = ref<string | undefined>();
  const account = computed(() =>
    accountId.value ? accounts.value?.get(accountId.value) : undefined,
  );
  const consoleLogLevels = ref(new Set(['info', 'warn', 'error']));

  accountId.value =
    (await window.api.settings.getProperty('activeAccountId')) ?? '';

  watch(
    [() => accounts.value?.size, accountId],
    async () => {
      // Not in use anymore (most likely hmr)
      if (!accounts.value) {
        return;
      }

      // Check if the active account still exists
      if (accounts.value.size) {
        if (!accountId.value || !accounts.value?.get(accountId.value)) {
          accountId.value = Array.from(accounts.value?.values() ?? [])?.[0]?.id;
        }
      } else {
        accountId.value = undefined;
      }

      await window.api.settings.setProperty('activeAccountId', accountId.value);
    },
    { immediate: true },
  );

  return reactive({
    accounts,
    modpacks,
    accountId,
    account,
    consoleLogLevels,
  });
});
