import {
  LoroDoc,
  LoroMap,
  LoroList,
  LoroTree,
  LoroMovableList,
  LoroText,
  Container,
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
 * Automatically manages the pool internally and infers types from LoroDoc schema.
 */
export function getMap<
  Schema extends Record<string, Container>,
  K extends keyof Schema & string,
>(
  doc: LoroDoc<Schema>,
  key: K,
): Schema[K] extends LoroMap<infer T> ? ObservableLoroMap<T> : never;
export function getMap<T extends Record<string, unknown>>(
  doc: LoroDoc,
  key: string,
): ObservableLoroMap<T>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMap(doc: LoroDoc, key: string): ObservableLoroMap<any> {
  const pool = getPool(doc);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return pool.get(doc.getMap(key)) as ObservableLoroMap<any>;
}

/**
 * Get an observable list from a document.
 * Automatically manages the pool internally and infers types from LoroDoc schema.
 */
export function getList<
  Schema extends Record<string, Container>,
  K extends keyof Schema & string,
>(
  doc: LoroDoc<Schema>,
  key: K,
): Schema[K] extends LoroList<infer T> ? ObservableLoroList<T> : never;
export function getList<T = unknown>(
  doc: LoroDoc,
  key: string,
): ObservableLoroList<T>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getList(doc: LoroDoc, key: string): ObservableLoroList<any> {
  const pool = getPool(doc);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return pool.get(doc.getList(key)) as ObservableLoroList<any>;
}

/**
 * Get an observable tree from a document.
 * Automatically manages the pool internally and infers types from LoroDoc schema.
 */
export function getTree<
  Schema extends Record<string, Container>,
  K extends keyof Schema & string,
>(
  doc: LoroDoc<Schema>,
  key: K,
): Schema[K] extends LoroTree<infer T> ? ObservableLoroTree<T> : never;
export function getTree<T extends Record<string, unknown>>(
  doc: LoroDoc,
  key: string,
): ObservableLoroTree<T>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTree(doc: LoroDoc, key: string): ObservableLoroTree<any> {
  const pool = getPool(doc);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return pool.get(doc.getTree(key)) as ObservableLoroTree<any>;
}

/**
 * Get an observable movable list from a document.
 * Automatically manages the pool internally and infers types from LoroDoc schema.
 */
export function getMovableList<
  Schema extends Record<string, Container>,
  K extends keyof Schema & string,
>(
  doc: LoroDoc<Schema>,
  key: K,
): Schema[K] extends LoroMovableList<infer T>
  ? ObservableMovableList<T>
  : never;
export function getMovableList<T = unknown>(
  doc: LoroDoc,
  key: string,
): ObservableMovableList<T>;
export function getMovableList(
  doc: LoroDoc,
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): ObservableMovableList<any> {
  const pool = getPool(doc);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return pool.get(doc.getMovableList(key)) as ObservableMovableList<any>;
}

/**
 * Get an observable text from a document.
 * Automatically manages the pool internally and infers types from LoroDoc schema.
 */
export function getText<
  Schema extends Record<string, Container>,
  K extends keyof Schema & string,
>(
  doc: LoroDoc<Schema>,
  key: K,
): Schema[K] extends LoroText ? ObservableLoroText : never;
export function getText(doc: LoroDoc, key: string): ObservableLoroText;
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
