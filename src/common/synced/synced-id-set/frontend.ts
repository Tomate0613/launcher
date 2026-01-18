import { Reactive, reactive } from 'vue';

export type SyncedItem = { id: string };

export class SyncedIdSet<T extends SyncedItem> {
  private map: Reactive<Map<string, T>>;
  private listenerCleanupFunctions: (() => void)[] = [];

  private constructor(id: string, map: Map<string, T>) {
    this.map = reactive(map);
    this.setupEvents(id);
  }

  private setupEvents(id: string) {
    this.on(`set-${id}`, (item) => this.map.set(item.id, item));
    this.on(`remove-${id}`, (id) => this.map.delete(id));
  }

  get(key: string) {
    return this.map.get(key);
  }

  values() {
    return this.map.values();
  }

  get size() {
    return this.map.size;
  }

  on(event: string, listener: (...args: any[]) => any) {
    this.listenerCleanupFunctions.push(
      window.api.on(event, (_ev, ...args: any[]) => {
        listener(...args);
      }),
    );
  }

  cleanup() {
    this.listenerCleanupFunctions.forEach((fn) => fn());
  }

  static async ofSynced<T extends SyncedItem>(id: string) {
    const items = (await window.api.invoke(`list-${id}` as any)) as any;
    const map = new Map<string, T>(items);

    return new SyncedIdSet<T>(id, map);
  }
}
