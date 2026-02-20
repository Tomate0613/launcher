import {
  MaybeRefOrGetter,
  onScopeDispose,
  ref,
  toValue,
  watch,
} from 'vue';
import {
  SyncedIdSet,
  type SyncedItem,
} from '../../../common/synced/synced-id-set/frontend';
import { log } from '../../../common/logging/log';

const logger = log('synced-id-set');

export async function useSyncedIdSet<T extends SyncedItem>(id: string) {
  const set = ref<SyncedIdSet<T> | null>(await SyncedIdSet.ofSynced<T>(id));

  const cleanup = () => {
    set.value?.cleanup();
    set.value = null;
  };

  onScopeDispose(() => {
    cleanup();
  });

  return set;
}

export function useSyncedIdSetReactive<T extends SyncedItem>(
  id: MaybeRefOrGetter<string>,
) {
  const set = ref<SyncedIdSet<T> | null>(null);
  let disposed = false;

  const cleanup = () => {
    set.value?.cleanup();
    set.value = null;
  };

  watch(
    [id],
    async ([newId], _, onCleanup) => {
      logger.verbose('now tracking', 'previously');
      cleanup();

      const current = await SyncedIdSet.ofSynced<T>(toValue(newId));

      if (disposed) {
        current.cleanup();
        return;
      }

      set.value = current;

      onCleanup(() => {
        current.cleanup();
      });
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    disposed = true;
    cleanup();
  });

  return set;
}
