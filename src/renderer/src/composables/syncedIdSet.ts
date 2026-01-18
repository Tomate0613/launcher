import {
  MaybeRefOrGetter,
  onUnmounted,
  ref,
  toValue,
  watch,
} from 'vue';
import {
  SyncedIdSet,
  type SyncedItem,
} from '../../../common/synced/synced-id-set/frontend';

export async function useSyncedIdSet<T extends SyncedItem>(id: string) {
  onUnmounted(() => {
    set?.value.cleanup();
  });

  const set = ref(await SyncedIdSet.ofSynced<T>(id));

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
    async ([newId], _oldId, onCleanup) => {
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

  onUnmounted(() => {
    disposed = true;
    cleanup();
  });

  return set;
}
