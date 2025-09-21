import { createAtom, runInAction } from "mobx";
import { LoroText, LoroEventBatch, Delta } from "loro-crdt";
import { OBSERVABLE_LORO_INTERNAL_CREATE } from "./internal";
import type { ObservableLoroPool } from "./pool";

/**
 * MobX-compatible wrapper for LoroText that provides reactive updates.
 *
 * @note Use ObservableLoroPool to create instances. Direct construction is not allowed.
 */
export class ObservableLoroText {
  private text: LoroText;
  private atom = createAtom("ObservableLoroText");
  private unsubscribe: (() => void) | null = null;
  readonly pool: ObservableLoroPool;

  private constructor(text: LoroText, pool: ObservableLoroPool) {
    this.text = text;
    this.pool = pool;

    this.atom = createAtom(
      "ObservableLoroText",
      () => {
        // Start observing when MobX starts tracking
        if (!this.unsubscribe) {
          this.unsubscribe = this.text.subscribe((event: LoroEventBatch) => {
            // Only handle remote changes - local changes are handled synchronously
            if (event.by !== "local") {
              this.handleTextChange();
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
   * Handle LoroText changes and report to MobX
   */
  private handleTextChange() {
    runInAction(() => {
      this.atom.reportChanged();
    });
  }

  /**
   * Get the text content
   */
  toString(): string {
    this.atom.reportObserved();
    return this.text.toString();
  }

  /**
   * Get text length
   */
  get length(): number {
    this.atom.reportObserved();
    return this.text.length;
  }

  /**
   * Insert text at position
   */
  insert(pos: number, text: string): void {
    this.text.insert(pos, text);
    this.atom.reportChanged();
  }

  /**
   * Delete text
   */
  delete(pos: number, len: number): void {
    this.text.delete(pos, len);
    this.atom.reportChanged();
  }

  /**
   * Apply a delta to the text
   */
  applyDelta(delta: Delta<string>[]): void {
    this.text.applyDelta(delta);
    this.atom.reportChanged();
  }

  /**
   * Get the text as a delta
   */
  toDelta(): Delta<string>[] {
    this.atom.reportObserved();
    return this.text.toDelta();
  }

  /**
   * Convert to JSON
   */
  toJSON(): string {
    this.atom.reportObserved();
    return this.text.toString();
  }

  /**
   * Get the underlying LoroText
   */
  get original(): LoroText {
    return this.text;
  }

  /**
   * Internal factory method for ObservableLoroPool using symbol as method name
   * @internal
   */
  static [OBSERVABLE_LORO_INTERNAL_CREATE](
    text: LoroText,
    pool: ObservableLoroPool,
  ): ObservableLoroText {
    return new ObservableLoroText(text, pool);
  }
}
