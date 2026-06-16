import { reactive, toRaw, watch } from 'vue';
import { log } from '../../../common/logging/log';

const logger = log('synced-settings');

export async function syncedSettings() {
  const raw = await window.api.invoke('getSettings');
  const settings = reactive(raw);

  let suppressEmit = false;

  window.api.on('settings-changed', (_e, patch) => {
    suppressEmit = true;

    for (const [key, value] of Object.entries(patch)) {
      (settings as any)[key] = value;
    }

    suppressEmit = false;
  });

  watch(
    settings,
    (newVal) => {
      logger.log('Settings changed');
      if (suppressEmit) return;

      // TODO
      for (const key in newVal) {
        window.api.invoke('setSettingsProperty', key as never, toRaw(newVal[key]));
      }
    },
    {
      deep: true,
    },
  );

  return settings;
}
