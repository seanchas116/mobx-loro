import { createAtom, runInAction } from "mobx";
import type {
  LoroMovableList,
  LoroEventBatch,
  Container,
  Side,
} from "loro-crdt";
import { OBSERVABLE_LORO_INTERNAL_CREATE } from "./internal";
import type { ObservableLoroPool } from "./pool";
import type { ToObservable } from "./types";

/**
 * MobX-compatible wrapper for LoroMovableList that provides reactive updates
 * using a single atom for the entire list (since list indices are unstable).
 *
 * @note Use ObservableLoroPool to create instances. Direct construction is not allowed.
 */
export class ObservableMovableList<T = unknown> {
  private list: LoroMovableList<T>;
  private atom = createAtom("ObservableMovableList");
  private unsubscribe: (() => void) | null = null;
  readonly pool: ObservableLoroPool;

  private constructor(list: LoroMovableList<T>, pool: ObservableLoroPool) {
    this.list = list;
    this.pool = pool;

    this.atom = createAtom(
      "ObservableMovableList",
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
   * Handle LoroMovableList changes and report to MobX
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
   * Set the value at the given position.
   */
  set<V extends T>(pos: number, value: Exclude<V, Container>): void {
    this.list.set(pos, value);
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
   * Set a container at the index.
   */
  setContainer<C extends Container>(pos: number, child: C): ToObservable<C> {
    const container = this.list.setContainer(pos, child);
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
  getAttached(): undefined | LoroMovableList<T> {
    return this.list.getAttached() as undefined | LoroMovableList<T>;
  }

  /**
   * Get the cursor position at the given pos.
   */
  getCursor(pos: number, side?: Side): unknown {
    return this.list.getCursor(pos, side);
  }

  /**
   * Move an item from one index to another
   * This is the key feature of MovableList
   */
  move(fromIndex: number, toIndex: number): void {
    this.list.move(fromIndex, toIndex);
    // Trigger change synchronously for local mutations
    this.handleListChange();
  }

  /**
   * Get the length
   */
  get length(): number {
    this.atom.reportObserved();
    return this.list.length;
  }

  /**
   * Get the underlying LoroMovableList
   */
  get original(): LoroMovableList<T> {
    return this.list;
  }

  /**
   * Internal factory method for ObservableLoroPool using symbol as method name
   * @internal
   */
  static [OBSERVABLE_LORO_INTERNAL_CREATE]<T = unknown>(
    list: LoroMovableList<T>,
    pool: ObservableLoroPool,
  ): ObservableMovableList<T> {
    return new ObservableMovableList(list, pool);
  }
}
