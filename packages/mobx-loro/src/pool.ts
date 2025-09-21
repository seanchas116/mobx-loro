import {
  type LoroDoc,
  LoroMap,
  LoroTree,
  LoroList,
  LoroMovableList,
  LoroText,
  type LoroEventBatch,
  type Container,
  ContainerID,
} from "loro-crdt";
import { ObservableLoroMap } from "./map";
import { ObservableLoroTree } from "./tree";
import { ObservableLoroList } from "./list";
import { ObservableMovableList } from "./movable-list";
import { ObservableLoroText } from "./text";
import { OBSERVABLE_LORO_INTERNAL_CREATE } from "./internal";

/**
 * Pool for managing observable Loro container instances.
 * Ensures that the same observable wrapper is returned for the same container ID,
 * enabling stable MobX observations across the application.
 * Uses separate maps for each container type for better type safety.
 */
export class ObservableLoroPool<
  T extends Record<string, Container> = Record<string, Container>,
> {
  readonly doc: LoroDoc<T>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private maps = new Map<ContainerID, ObservableLoroMap<any>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private trees = new Map<ContainerID, ObservableLoroTree<any>>();
  private lists = new Map<ContainerID, ObservableLoroList>();
  private movableLists = new Map<ContainerID, ObservableMovableList>();
  private texts = new Map<ContainerID, ObservableLoroText>();

  private unsubscribe: (() => void) | null = null;

  constructor(doc: LoroDoc<T>) {
    this.doc = doc;
    this.setupEventHandling();
  }

  /**
   * Get or create an ObservableLoroMap for the given container
   */
  private getMap<T extends Record<string, unknown>>(
    map: LoroMap<T>,
  ): ObservableLoroMap<T> {
    const existing = this.maps.get(map.id);
    if (existing) {
      return existing as ObservableLoroMap<T>;
    }

    const observable = ObservableLoroMap[OBSERVABLE_LORO_INTERNAL_CREATE]<T>(
      map,
      this,
    );
    this.maps.set(map.id, observable);
    return observable;
  }

  /**
   * Get or create an ObservableLoroTree for the given container
   */
  private getTree<T extends Record<string, unknown>>(
    tree: LoroTree<T>,
  ): ObservableLoroTree<T> {
    const existing = this.trees.get(tree.id);
    if (existing) {
      return existing as ObservableLoroTree<T>;
    }

    const observable = ObservableLoroTree[OBSERVABLE_LORO_INTERNAL_CREATE]<T>(
      tree,
      this,
    );
    this.trees.set(tree.id, observable);
    return observable;
  }

  /**
   * Get or create an ObservableLoroList for the given container
   */
  private getList<T>(list: LoroList<T>): ObservableLoroList<T> {
    const existing = this.lists.get(list.id);
    if (existing) {
      return existing as ObservableLoroList<T>;
    }

    const observable = ObservableLoroList[OBSERVABLE_LORO_INTERNAL_CREATE]<T>(
      list,
      this,
    );
    this.lists.set(list.id, observable);
    return observable;
  }

  /**
   * Get or create an ObservableMovableList for the given container
   */
  private getMovableList<T>(
    movableList: LoroMovableList<T>,
  ): ObservableMovableList<T> {
    const existing = this.movableLists.get(movableList.id);
    if (existing) {
      return existing as ObservableMovableList<T>;
    }

    const observable = ObservableMovableList[
      OBSERVABLE_LORO_INTERNAL_CREATE
    ]<T>(movableList, this);
    this.movableLists.set(movableList.id, observable);
    return observable;
  }

  /**
   * Get or create an ObservableLoroText for the given container
   */
  private getText(text: LoroText): ObservableLoroText {
    const existing = this.texts.get(text.id);
    if (existing) {
      return existing;
    }

    const observable = ObservableLoroText[OBSERVABLE_LORO_INTERNAL_CREATE](
      text,
      this,
    );
    this.texts.set(text.id, observable);
    return observable;
  }

  /**
   * Generic get method that converts Loro containers to their observable counterparts
   * and passes through regular values unchanged.
   *
   * @param value - A Loro container or any regular value
   * @returns Observable wrapper for containers, or the original value for non-containers
   */
  get<T extends Record<string, unknown>>(
    value: LoroMap<T>,
  ): ObservableLoroMap<T>;
  get<T>(value: LoroList<T>): ObservableLoroList<T>;
  get<T extends Record<string, unknown>>(
    value: LoroTree<T>,
  ): ObservableLoroTree<T>;
  get<T>(value: LoroMovableList<T>): ObservableMovableList<T>;
  get(value: LoroText): ObservableLoroText;
  get<T>(value: T): T;
  get(value: unknown): unknown {
    // Use instanceof to check container types
    if (value instanceof LoroMap) {
      return this.getMap(value);
    }
    if (value instanceof LoroTree) {
      return this.getTree(value);
    }
    if (value instanceof LoroMovableList) {
      return this.getMovableList(value);
    }
    if (value instanceof LoroList) {
      return this.getList(value);
    }
    if (value instanceof LoroText) {
      return this.getText(value);
    }

    // Not a container, return as-is
    return value;
  }

  /**
   * Clear a specific instance from the pool by container type and ID
   */
  clearInstance(
    type: "map" | "tree" | "list" | "movable" | "text",
    id: ContainerID,
  ): void {
    switch (type) {
      case "map":
        this.maps.delete(id);
        break;
      case "tree":
        this.trees.delete(id);
        break;
      case "list":
        this.lists.delete(id);
        break;
      case "movable":
        this.movableLists.delete(id);
        break;
      case "text":
        this.texts.delete(id);
        break;
    }
  }

  /**
   * Clear all instances from the pool
   */
  clearAll(): void {
    this.maps.clear();
    this.trees.clear();
    this.lists.clear();
    this.movableLists.clear();
    this.texts.clear();
  }

  /**
   * Get the total number of cached instances across all types
   */
  get size(): number {
    return (
      this.maps.size +
      this.trees.size +
      this.lists.size +
      this.movableLists.size +
      this.texts.size
    );
  }

  /**
   * Check if an instance exists in the pool for a specific type and ID
   */
  has(
    type: "map" | "tree" | "list" | "movable" | "text",
    id: ContainerID,
  ): boolean {
    switch (type) {
      case "map":
        return this.maps.has(id);
      case "tree":
        return this.trees.has(id);
      case "list":
        return this.lists.has(id);
      case "movable":
        return this.movableLists.has(id);
      case "text":
        return this.texts.has(id);
      default:
        return false;
    }
  }

  /**
   * Set up event handling for future auto-cleanup
   */
  private setupEventHandling(): void {
    // TODO: Implement auto-cleanup based on Loro events
    // For now, just set up the subscription structure
    this.unsubscribe = this.doc.subscribe((event: LoroEventBatch) => {
      // Future: Analyze events to determine if containers have been deleted
      // and clean up corresponding observable instances
      this.handleLoroEvent(event);
    });
  }

  /**
   * Handle Loro events for auto-cleanup (to be implemented)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleLoroEvent(_event: LoroEventBatch): void {
    // TODO: Implement logic to detect deleted containers and clean up instances
    // This will require analyzing the event structure to identify container deletions
  }

  /**
   * Dispose the pool and clean up resources
   */
  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.clearAll();
  }
}
