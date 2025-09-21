import { createAtom, runInAction } from "mobx";
import type {
  LoroMap,
  LoroEventBatch,
  Container,
  ContainerID,
} from "loro-crdt";
import { OBSERVABLE_LORO_INTERNAL_CREATE } from "./internal";
import type { ObservableLoroPool } from "./pool";
import type { ToObservable, ToObservableRecord } from "./types";

/**
 * MobX-compatible wrapper for LoroMap that provides reactive updates
 * using a single atom for the entire map (since map keys are unstable).
 *
 * @note Use ObservableLoroPool to create instances. Direct construction is not allowed.
 */
export class ObservableLoroMap<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  private map: LoroMap<T>;
  private atom = createAtom("ObservableLoroMap");
  private unsubscribe: (() => void) | null = null;
  readonly pool: ObservableLoroPool;

  private constructor(map: LoroMap<T>, pool: ObservableLoroPool) {
    this.map = map;
    this.pool = pool;

    this.atom = createAtom(
      "ObservableLoroMap",
      () => {
        // Start observing when MobX starts tracking
        if (!this.unsubscribe) {
          this.unsubscribe = this.map.subscribe((event: LoroEventBatch) => {
            // Only handle remote changes - local changes are handled synchronously
            if (event.by !== "local") {
              this.handleMapChange();
            }
          });
        }
      },
      () => {
        // Stop observing when MobX stops tracking
        if (this.unsubscribe) {
          this.unsubscribe();
          this.unsubscribe = null;
        }
      },
    );
  }

  /**
   * Handle LoroMap changes and report to MobX
   */
  private handleMapChange() {
    // Make sure to run inside action to trigger MobX reactions
    runInAction(() => {
      this.atom.reportChanged();
    });
  }

  get id(): ContainerID {
    return this.map.id;
  }

  /**
   * Get a value by key
   */
  get<K extends keyof T>(key: K): ToObservable<T[K]> {
    this.atom.reportObserved();
    const value = this.map.get(key);
    return this.pool.get(value) as ToObservable<T[K]>;
  }

  /**
   * Set a value
   */
  set<Key extends keyof T, V extends T[Key]>(
    key: Key,
    value: Exclude<V, Container>,
  ): void {
    this.map.set(key, value);
    // Trigger change synchronously for local mutations
    this.handleMapChange();
  }

  /**
   * Delete a key
   */
  delete(key: string): void {
    this.map.delete(key);
    // Trigger change synchronously for local mutations
    this.handleMapChange();
  }

  /**
   * Get or create a container at the key
   */
  getOrCreateContainer<C extends Container>(
    key: string,
    child: C,
  ): ToObservable<C> {
    const container = this.map.getOrCreateContainer(key, child);
    this.handleMapChange();
    return this.pool.get(container) as ToObservable<C>;
  }

  /**
   * Set a container at the key
   */
  setContainer<C extends Container, Key extends keyof T>(
    key: Key,
    child: C,
  ): ToObservable<C> {
    const container = this.map.setContainer(key, child);
    this.handleMapChange();
    return this.pool.get(container) as ToObservable<C>;
  }

  /**
   * Get the size
   */
  get size(): number {
    this.atom.reportObserved();
    return this.map.size;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.map.clear();
    // Trigger change synchronously for local mutations
    this.handleMapChange();
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    this.atom.reportObserved();
    return this.map.keys() as string[];
  }

  /**
   * Get all values
   */
  values(): ToObservable<T[keyof T]>[] {
    this.atom.reportObserved();
    const values = this.map.values() as T[keyof T][];
    return values.map((value) => this.pool.get(value)) as ToObservable<
      T[keyof T]
    >[];
  }

  /**
   * Get all entries
   */
  entries(): [string, ToObservable<T[keyof T]>][] {
    this.atom.reportObserved();
    const entries = this.map.entries();
    return entries.map(([key, value]) => [key, this.pool.get(value)]) as [
      string,
      ToObservable<T[keyof T]>,
    ][];
  }

  /**
   * Convert to JSON
   */
  toJSON(): ToObservableRecord<T> {
    this.atom.reportObserved();
    const json = this.map.toJSON() as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(json)) {
      result[key] = this.pool.get(value);
    }
    return result as ToObservableRecord<T>;
  }

  /**
   * Get the underlying LoroMap
   */
  get original(): LoroMap<T> {
    return this.map;
  }

  /**
   * Internal factory method for ObservableLoroPool using symbol as method name
   * @internal
   */
  static [OBSERVABLE_LORO_INTERNAL_CREATE]<
    T extends Record<string, unknown> = Record<string, unknown>,
  >(map: LoroMap<T>, pool: ObservableLoroPool): ObservableLoroMap<T> {
    return new ObservableLoroMap(map, pool);
  }
}
