import { createAtom, runInAction } from "mobx";
import type {
  LoroTree,
  LoroTreeNode,
  LoroEventBatch,
  TreeID,
  ContainerID,
} from "loro-crdt";
import { ObservableLoroMap } from "./map";
import type { ObservableLoroPool } from "./pool";
import { OBSERVABLE_LORO_INTERNAL_CREATE } from "./internal";

/**
 * MobX-compatible wrapper for LoroTreeNode that provides reactive updates.
 * Unlike LoroTreeNode, this wrapper ensures the same instance is always returned
 * for a given node, enabling stable MobX observation and preventing unnecessary re-renders.
 *
 * @note This class is typically created internally by ObservableLoroTree.
 */
export class ObservableLoroTreeNode<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  private node: LoroTreeNode<T>;
  private tree: ObservableLoroTree<T>;
  private atom = createAtom("ObservableLoroTreeNode");
  readonly id: TreeID;
  /**
   * The associated metadata map container
   */
  readonly data: ObservableLoroMap<T>;

  constructor(
    node: LoroTreeNode<T>,
    tree: ObservableLoroTree<T>,
    pool: ObservableLoroPool,
  ) {
    this.node = node;
    this.tree = tree;
    this.id = node.id;
    // Pool is required to create ObservableLoroMap instances
    if (!pool) {
      throw new Error(
        "ObservableLoroPool is required to create ObservableLoroTreeNode",
      );
    }
    this.data = pool.get(node.data);
  }

  /**
   * Create a new child node
   */
  createNode(index?: number): ObservableLoroTreeNode<T> {
    const newNode = this.node.createNode(index);
    this.tree.handleChange();
    return this.tree.wrapNode(newNode);
  }

  /**
   * Move this node to be a child of the parent
   */
  move(parent?: ObservableLoroTreeNode<T>, index?: number): void {
    this.node.move(parent?.original, index);
    this.tree.handleChange();
  }

  /**
   * Move this node to be after the target node
   */
  moveAfter(target: ObservableLoroTreeNode<T>): void {
    this.node.moveAfter(target.original);
    this.tree.handleChange();
  }

  /**
   * Move this node to be before the target node
   */
  moveBefore(target: ObservableLoroTreeNode<T>): void {
    this.node.moveBefore(target.original);
    this.tree.handleChange();
  }

  /**
   * Get the parent node
   */
  parent(): ObservableLoroTreeNode<T> | undefined {
    this.atom.reportObserved();
    const parentNode = this.node.parent();
    return parentNode ? this.tree.wrapNode(parentNode) : undefined;
  }

  /**
   * Get all children nodes
   */
  children(): ObservableLoroTreeNode<T>[] {
    this.atom.reportObserved();
    const children = this.node.children();
    return children ? children.map((child) => this.tree.wrapNode(child)) : [];
  }

  /**
   * Get the index of the node in the parent's children
   */
  index(): number | undefined {
    this.atom.reportObserved();
    return this.node.index();
  }

  /**
   * Get the fractional index of the node
   */
  fractionalIndex(): string | undefined {
    this.atom.reportObserved();
    return this.node.fractionalIndex();
  }

  /**
   * Check if this node is deleted
   */
  isDeleted(): boolean {
    this.atom.reportObserved();
    return this.node.isDeleted();
  }

  /**
   * Get the last mover of this node
   */
  getLastMoveId(): { peer: string; counter: number } | undefined {
    this.atom.reportObserved();
    return this.node.getLastMoveId();
  }

  /**
   * Get the creation id of this node
   */
  creationId(): { peer: string; counter: number } {
    this.atom.reportObserved();
    return this.node.creationId();
  }

  /**
   * Get the creator of this node
   */
  creator(): string {
    this.atom.reportObserved();
    return this.node.creator();
  }

  /**
   * Report that this node has changed
   */
  reportChanged(): void {
    this.atom.reportChanged();
  }

  /**
   * Get the underlying LoroTreeNode
   */
  get original(): LoroTreeNode<T> {
    return this.node;
  }

  get pool(): ObservableLoroPool {
    return this.tree.pool;
  }
}

/**
 * MobX-compatible wrapper for LoroTree that provides reactive updates
 */
export class ObservableLoroTree<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  private tree: LoroTree<T>;
  private atom = createAtom("ObservableLoroTree");
  private unsubscribe: (() => void) | null = null;
  private nodeWrappers: Map<TreeID, ObservableLoroTreeNode<T>> = new Map();
  readonly pool: ObservableLoroPool;

  private constructor(tree: LoroTree<T>, pool: ObservableLoroPool) {
    this.tree = tree;
    this.pool = pool;

    this.atom = createAtom(
      "ObservableLoroTree",
      () => {
        // Start observing when MobX starts tracking
        if (!this.unsubscribe) {
          this.unsubscribe = this.tree.subscribe((event: LoroEventBatch) => {
            // Only handle remote changes - local changes are handled synchronously
            if (event.by !== "local") {
              this.handleRemoteChange(event);
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

  get id(): ContainerID {
    return this.tree.id;
  }

  /**
   * Wrap a LoroTreeNode with an ObservableLoroTreeNode, reusing existing wrappers
   */
  wrapNode(node: LoroTreeNode<T>): ObservableLoroTreeNode<T> {
    const nodeId = node.id;
    let wrapper = this.nodeWrappers.get(nodeId);
    if (!wrapper) {
      wrapper = new ObservableLoroTreeNode(node, this, this.pool);
      this.nodeWrappers.set(nodeId, wrapper);
    }
    return wrapper;
  }

  /**
   * Handle tree changes and report to MobX
   */
  handleChange(): void {
    // Make sure to run inside action to trigger MobX reactions
    runInAction(() => {
      this.atom.reportChanged();
      // Also notify all cached node wrappers
      for (const [, wrapper] of this.nodeWrappers) {
        wrapper.reportChanged();
      }
    });
  }

  /**
   * Handle remote changes
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleRemoteChange(_event: LoroEventBatch): void {
    runInAction(() => {
      // Notify the tree that something changed
      this.atom.reportChanged();

      // Since we don't know the exact structure of the event,
      // we'll update all existing node wrappers with fresh nodes
      // This maintains stable wrapper instances while ensuring data is up-to-date
      // TODO: fine-grained update of the node wrappers
      for (const [nodeId, wrapper] of this.nodeWrappers) {
        const freshNode = this.tree.getNodeByID(nodeId);
        if (freshNode) {
          // Notify that this node may have changed
          wrapper.reportChanged();
        } else {
          // Node might have been deleted
          wrapper.reportChanged();
        }
      }
    });
  }

  /**
   * Create a new tree node
   */
  createNode(parent?: TreeID, index?: number): ObservableLoroTreeNode<T> {
    const newNode = this.tree.createNode(parent, index);
    this.handleChange();
    return this.wrapNode(newNode);
  }

  /**
   * Move a node to be a child of the parent
   */
  move(target: TreeID, parent?: TreeID, index?: number): void {
    this.tree.move(target, parent, index);
    this.handleChange();
  }

  /**
   * Delete a node by ID
   */
  delete(target: TreeID): void {
    this.tree.delete(target);
    this.handleChange();
  }

  /**
   * Check if the tree contains the TreeID
   */
  has(target: TreeID): boolean {
    this.atom.reportObserved();
    return this.tree.has(target);
  }

  /**
   * Check if a node is deleted
   */
  isNodeDeleted(target: TreeID): boolean {
    this.atom.reportObserved();
    return this.tree.isNodeDeleted(target);
  }

  /**
   * Get LoroTreeNode by the TreeID
   */
  getNodeByID(target: TreeID): ObservableLoroTreeNode<T> | undefined {
    this.atom.reportObserved();
    const node = this.tree.getNodeByID(target);
    return node ? this.wrapNode(node) : undefined;
  }

  /**
   * Get all nodes
   */
  getNodes(options?: { withDeleted?: boolean }): ObservableLoroTreeNode<T>[] {
    this.atom.reportObserved();
    return this.tree.getNodes(options).map((node) => this.wrapNode(node));
  }

  /**
   * Get the root nodes
   */
  roots(): ObservableLoroTreeNode<T>[] {
    this.atom.reportObserved();
    return (this.tree.roots() as LoroTreeNode<T>[]).map((root) =>
      this.wrapNode(root),
    );
  }

  /**
   * Get the hierarchy array
   */
  toArray(): unknown[] {
    this.atom.reportObserved();
    return this.tree.toArray();
  }

  /**
   * Convert to JSON
   */
  toJSON(): unknown {
    this.atom.reportObserved();
    return this.tree.toJSON();
  }

  /**
   * Enable fractional index
   */
  enableFractionalIndex(jitter: number): void {
    this.tree.enableFractionalIndex(jitter);
  }

  /**
   * Disable fractional index
   */
  disableFractionalIndex(): void {
    this.tree.disableFractionalIndex();
  }

  /**
   * Check if fractional index is enabled
   */
  isFractionalIndexEnabled(): boolean {
    this.atom.reportObserved();
    return this.tree.isFractionalIndexEnabled();
  }

  /**
   * Get the underlying LoroTree
   */
  get original(): LoroTree<T> {
    return this.tree;
  }

  /**
   * Internal factory method for ObservableLoroPool using symbol as method name
   * @internal
   */
  static [OBSERVABLE_LORO_INTERNAL_CREATE]<
    T extends Record<string, unknown> = Record<string, unknown>,
  >(tree: LoroTree<T>, pool: ObservableLoroPool): ObservableLoroTree<T> {
    return new ObservableLoroTree(tree, pool);
  }
}
