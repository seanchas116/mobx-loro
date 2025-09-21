import { createAtom, runInAction } from "mobx";
import type { LoroList, LoroEventBatch, Container, Side } from "loro-crdt";
import { OBSERVABLE_LORO_INTERNAL_CREATE } from "./internal";
import type { ObservableLoroPool } from "./pool";
import type { ToObservable } from "./types";

/**
 * MobX-compatible wrapper for LoroList that provides reactive updates
 * using a single atom for the entire list (since list indices are unstable).
 *
 * @note Use ObservableLoroPool to create instances. Direct construction is not allowed.
 */
export class ObservableLoroList<T = unknown> {
  private list: LoroList<T>;
  private atom = createAtom("ObservableLoroList");
  private unsubscribe: (() => void) | null = null;
  readonly pool: ObservableLoroPool;

  private constructor(list: LoroList<T>, pool: ObservableLoroPool) {
    this.list = list;
    this.pool = pool;

    this.atom = createAtom(
      "ObservableLoroList",
      () => {
        // Start observing when MobX starts tracking
        if (!this.unsubscribe) {
          this.unsubscribe = this.list.subscribe((event: LoroEventBatch) => {
            // Only handle remote changes - local changes are handled synchronously
            if (event.by !== "local") {
              this.handleListChange();
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
   * Handle LoroList changes and report to MobX
   */
  private handleListChange() {
    // Make sure to run inside action to trigger MobX reactions
    runInAction(() => {
      this.atom.reportChanged();
    });
  }

  /**
   * Get the value at the index. If the value is a container, the corresponding handler will be returned.
   */
  get(index: number): ToObservable<T> {
    this.atom.reportObserved();
    const value = this.list.get(index);
    return this.pool.get(value) as ToObservable<T>;
  }

  /**
   * Insert a value at index.
   */
  insert<V extends T>(pos: number, value: Exclude<V, Container>): void {
    this.list.insert(pos, value);
    // Trigger change synchronously for local mutations
    this.handleListChange();
  }

  /**
   * Delete items starting at index
   */
  delete(pos: number, len: number): void {
    this.list.delete(pos, len);
    // Trigger change synchronously for local mutations
    this.handleListChange();
  }

  /**
   * Push a value to the end of the list
   */
  push<V extends T>(value: Exclude<V, Container>): void {
    this.list.push(value);
    // Trigger change synchronously for local mutations
    this.handleListChange();
  }

  /**
   * Get elements of the list. If the value is a child container, the corresponding
   * `Container` will be returned.
   */
  toArray(): ToObservable<T>[] {
    this.atom.reportObserved();
    const array = this.list.toArray();
    return array.map((value) => this.pool.get(value)) as ToObservable<T>[];
  }

  /**
   * Insert a container at the index.
   */
  insertContainer<C extends Container>(pos: number, child: C): ToObservable<C> {
    const container = this.list.insertContainer(pos, child);
    this.handleListChange();
    return this.pool.get(container) as ToObservable<C>;
  }

  /**
   * Push a container to the end of the list.
   */
  pushContainer<C extends Container>(child: C): ToObservable<C> {
    const container = this.list.pushContainer(child);
    this.handleListChange();
    return this.pool.get(container) as ToObservable<C>;
  }

  /**
   * Subscribe to changes
   */
  subscribe(listener: (event: LoroEventBatch) => void): () => void {
    return this.list.subscribe(listener);
  }

  /**
   * Get the attached list
   */
  getAttached(): undefined | LoroList<T> {
    return this.list.getAttached() as undefined | LoroList<T>;
  }

  /**
   * Get the cursor position at the given pos.
   */
  getCursor(pos: number, side?: Side): unknown {
    return this.list.getCursor(pos, side);
  }

  /**
   * Get the length
   */
  get length(): number {
    this.atom.reportObserved();
    return this.list.length;
  }

  /**
   * Get the underlying LoroList
   */
  get original(): LoroList<T> {
    return this.list;
  }

  /**
   * Internal factory method for ObservableLoroPool using symbol as method name
   * @internal
   */
  static [OBSERVABLE_LORO_INTERNAL_CREATE]<T = unknown>(
    list: LoroList<T>,
    pool: ObservableLoroPool,
  ): ObservableLoroList<T> {
    return new ObservableLoroList(list, pool);
  }
}
