import { onMounted, ref } from 'vue';
import type { Routes, RouteReturn, RouteArgs } from '../../../preload/types';

export function mountInvoke<Key extends keyof Routes>(
  route: Key,
  ...args: RouteArgs<Routes[Key]>
) {
  const ret = ref<Awaited<RouteReturn<Routes[Key]>> | undefined>(undefined);

  onMounted(async () => {
    ret.value = await window.api.invoke(route, ...args);
  });

  return ret;
}

/**
 * Invokes and fails silently in case of error
 */
export function tryMountInvoke<Key extends keyof Routes>(
  route: Key,
  ...args: RouteArgs<Routes[Key]>
) {
  const ret = ref<Awaited<RouteReturn<Routes[Key]>> | undefined>(undefined);

  onMounted(async () => {
    try {
      ret.value = await window.api.invoke(route, ...args);
    } catch {}
  });

  return ret;
}
