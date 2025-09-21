import {
  LoroDoc,
  LoroMap,
  LoroList,
  LoroTree,
  LoroMovableList,
  LoroText,
} from "loro-crdt";
import { ObservableLoroPool } from "./pool";
import { ObservableLoroMap } from "./map";
import { ObservableLoroList } from "./list";
import { ObservableLoroTree } from "./tree";
import { ObservableMovableList } from "./movable-list";
import { ObservableLoroText } from "./text";

// WeakMap to store pools per document
const docPools = new WeakMap<LoroDoc, ObservableLoroPool>();

/**
 * Get or create a pool for the given document.
 * Pools are automatically managed and cached per document.
 */
function getPool(doc: LoroDoc): ObservableLoroPool {
  let pool = docPools.get(doc);
  if (!pool) {
    pool = new ObservableLoroPool(doc);
    docPools.set(doc, pool);
  }
  return pool;
}

/**
 * Get an observable map from a document.
 * Automatically manages the pool internally.
 */
export function getMap<
  T extends Record<string, unknown> = Record<string, unknown>,
>(doc: LoroDoc, key: string): ObservableLoroMap<T> {
  const pool = getPool(doc);
  return pool.get(doc.getMap(key)) as ObservableLoroMap<T>;
}

/**
 * Get an observable list from a document.
 * Automatically manages the pool internally.
 */
export function getList<T = unknown>(
  doc: LoroDoc,
  key: string,
): ObservableLoroList<T> {
  const pool = getPool(doc);
  return pool.get(doc.getList(key)) as ObservableLoroList<T>;
}

/**
 * Get an observable tree from a document.
 * Automatically manages the pool internally.
 */
export function getTree<
  T extends Record<string, unknown> = Record<string, unknown>,
>(doc: LoroDoc, key: string): ObservableLoroTree<T> {
  const pool = getPool(doc);
  return pool.get(doc.getTree(key)) as ObservableLoroTree<T>;
}

/**
 * Get an observable movable list from a document.
 * Automatically manages the pool internally.
 */
export function getMovableList<T = unknown>(
  doc: LoroDoc,
  key: string,
): ObservableMovableList<T> {
  const pool = getPool(doc);
  return pool.get(doc.getMovableList(key)) as ObservableMovableList<T>;
}

/**
 * Get an observable text from a document.
 * Automatically manages the pool internally.
 */
export function getText(doc: LoroDoc, key: string): ObservableLoroText {
  const pool = getPool(doc);
  return pool.get(doc.getText(key)) as ObservableLoroText;
}

/**
 * Convert any Loro container to its observable counterpart.
 * Automatically manages the pool internally.
 */
export function toObservable<T extends Record<string, unknown>>(
  container: LoroMap<T>,
): ObservableLoroMap<T>;
export function toObservable<T>(container: LoroList<T>): ObservableLoroList<T>;
export function toObservable<T extends Record<string, unknown>>(
  container: LoroTree<T>,
): ObservableLoroTree<T>;
export function toObservable<T>(
  container: LoroMovableList<T>,
): ObservableMovableList<T>;
export function toObservable(container: LoroText): ObservableLoroText;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toObservable(container: any): any {
  // Get the document from the container
  // Note: This assumes containers have a way to get their parent doc
  // We may need to adjust based on Loro's actual API
  const doc = container.doc || container.parent?.doc;
  if (!doc) {
    throw new Error("Cannot determine document for container");
  }

  const pool = getPool(doc);
  return pool.get(container);
}

/**
 * Dispose the pool for a document, cleaning up all subscriptions.
 * After calling this, new calls to get* functions will create a new pool.
 */
export function disposePool(doc: LoroDoc): void {
  const pool = docPools.get(doc);
  if (pool) {
    pool.dispose();
    docPools.delete(doc);
  }
}
