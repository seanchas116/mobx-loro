import {
  LoroMap,
  LoroList,
  LoroTree,
  LoroMovableList,
  LoroText,
  Container,
} from "loro-crdt";
import { ObservableLoroMap } from "./map";
import { ObservableLoroList } from "./list";
import { ObservableLoroTree } from "./tree";
import { ObservableMovableList } from "./movable-list";
import { ObservableLoroText } from "./text";

/**
 * Type metafunction that maps Loro container types to their observable counterparts.
 * Non-container types pass through unchanged.
 */
export type ToObservable<T> =
  T extends LoroMap<infer U>
    ? ObservableLoroMap<U>
    : T extends LoroList<infer U>
      ? ObservableLoroList<U>
      : T extends LoroTree<infer U>
        ? ObservableLoroTree<U>
        : T extends LoroMovableList<infer U>
          ? ObservableMovableList<U>
          : T extends LoroText
            ? ObservableLoroText
            : T extends Container
              ? never // Unknown container type
              : T; // Non-container types pass through

/**
 * Type metafunction for arrays - maps each element type
 */
export type ToObservableArray<T> = T extends readonly (infer U)[]
  ? ToObservable<U>[]
  : never;

/**
 * Type metafunction for map values
 */
export type ToObservableRecord<T extends Record<string, unknown>> = {
  [K in keyof T]: ToObservable<T[K]>;
};
