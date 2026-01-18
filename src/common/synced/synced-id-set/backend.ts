import { ipcMain } from 'electron';
import { invoke } from '../../../main/api';

export type SyncedItem = { id: string };
export type ClassItem = SyncedItem & { frontendData(): { id: string } };
export type Converter<T extends SyncedItem> = (item: T) => { id: string };

export class SyncedIdSet<T extends SyncedItem> {
  public readonly id: string;
  private map: Map<string, T>;
  private converter: Converter<T>;

  private constructor(
    id: string,
    map: Map<string, T>,
    converter: Converter<T>,
  ) {
    this.id = id;
    this.map = map;
    this.converter = converter;
  }

  push(item: T) {
    this.map.set(item.id, item);
    this.invalidate(item);
  }

  remove(item: T | string) {
    const id = typeof item === 'string' ? item : item.id;
    this.map.delete(id);
    invoke(`remove-${this.id}`, id);
  }

  invalidate(item: T) {
    invoke(`set-${this.id}`, this.converter(item));
  }

  get(key: string) {
    return this.map.get(key);
  }

  has(key: string) {
    return this.map.has(key);
  }

  values() {
    return this.map.values();
  }

  forEach(callbackFn: (item: T) => void) {
    this.map.values().forEach(callbackFn);
  }

  on(event: string, listener: (...args: any[]) => any) {
    ipcMain.handle(event, (_ev, ...args: any[]) => {
      return listener(...args);
    });
  }

  static ofList<T extends SyncedItem>(
    id: string,
    list: T[],
    converter: Converter<T>,
  ) {
    const map = new Map<string, T>();

    for (const item of list) {
      map.set(item.id, item);
    }

    return this.ofPrimary(id, map, converter);
  }

  static ofClassList<T extends ClassItem>(id: string, list: T[]) {
    return this.ofList(id, list, (item) => item.frontendData());
  }

  static ofPrimary<T extends SyncedItem>(
    id: string,
    map: Map<string, T>,
    converter: Converter<T>,
  ) {
    const syncedSet = new SyncedIdSet(id, map, converter);
    syncedSet.on(`list-${id}`, () =>
      [...syncedSet.map].map(([key, value]) => [key, converter(value)]),
    );

    return syncedSet;
  }
}
