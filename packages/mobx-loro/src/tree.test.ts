import { describe, it, expect, vi } from "vitest";
import { reaction, autorun } from "mobx";
import { createTestPool } from "./test-helpers";

describe("ObservableLoroTree", () => {
  describe("Basic Operations", () => {
    it("should create and manage tree structure", () => {
      const { pool, doc } = createTestPool();
      const loroTree = doc.getTree("tree");
      const observableTree = pool.get(loroTree);

      // Create nodes
      const root = observableTree.createNode();
      const child1 = root.createNode();
      const child2 = root.createNode();
      const grandchild = child1.createNode();

      // Check structure
      expect(observableTree.roots()).toHaveLength(1);
      expect(observableTree.roots()[0].id).toBe(root.id);
      expect(root.children()).toHaveLength(2);
      expect(root.children()[0].id).toBe(child1.id);
      expect(root.children()[1].id).toBe(child2.id);
      expect(child1.children()).toHaveLength(1);
      expect(child1.children()[0].id).toBe(grandchild.id);

      // Check parents
      expect(root.parent()).toBeUndefined();
      expect(child1.parent()?.id).toBe(root.id);
      expect(grandchild.parent()?.id).toBe(child1.id);

      // Get node by ID
      const foundNode = observableTree.getNodeByID(grandchild.id);
      expect(foundNode?.id).toBe(grandchild.id);
    });

    it("should handle node data operations", () => {
      const { pool, doc } = createTestPool();
      const loroTree = doc.getTree("tree");
      const observableTree = pool.get(loroTree);

      const node = observableTree.createNode();

      // Set data on the node
      node.data.set("name", "Test Node");
      node.data.set("value", 42);

      // Check data
      expect(node.data.get("name")).toBe("Test Node");
      expect(node.data.get("value")).toBe(42);
    });

    it("should handle delete operations", () => {
      const { pool, doc } = createTestPool();
      const loroTree = doc.getTree("tree");
      const observableTree = pool.get(loroTree);

      const root = observableTree.createNode();
      const child1 = root.createNode();
      const child2 = root.createNode();
      const grandchild = child1.createNode();

      // Delete child1 (which has a grandchild)
      observableTree.delete(child1.id);
      expect(root.children()).toHaveLength(1);
      expect(root.children()[0].id).toBe(child2.id);
      expect(child1.isDeleted()).toBe(true);
      expect(grandchild.isDeleted()).toBe(true);

      // Get all nodes including deleted
      const allNodes = observableTree.getNodes({ withDeleted: true });
      expect(allNodes.length).toBeGreaterThan(observableTree.getNodes().length);
    });
  });

  describe("Move Operations", () => {
    it("should support node move operations", () => {
      const { pool, doc } = createTestPool();
      const loroTree = doc.getTree("tree");
      const observableTree = pool.get(loroTree);

      // Create structure:
      // root1
      //   - child1
      //   - child2
      // root2
      const root1 = observableTree.createNode();
      const child1 = root1.createNode();
      const child2 = root1.createNode();
      const root2 = observableTree.createNode();

      // Move child1 to root2
      child1.move(root2);
      expect(child1.parent()?.id).toBe(root2.id);
      expect(root1.children()).toHaveLength(1);
      expect(root2.children()).toHaveLength(1);

      // Move child2 to be before child1
      child2.move(root2, 0);
      expect(root2.children()[0].id).toBe(child2.id);
      expect(root2.children()[1].id).toBe(child1.id);

      // Move using tree.move
      observableTree.move(child1.id, root1.id);
      expect(child1.parent()?.id).toBe(root1.id);
      expect(root1.children()).toHaveLength(1);
    });

    it("should support moveAfter and moveBefore", () => {
      const { pool, doc } = createTestPool();
      const loroTree = doc.getTree("tree");
      const observableTree = pool.get(loroTree);

      const root = observableTree.createNode();
      const node1 = root.createNode();
      const node2 = root.createNode();
      const node3 = root.createNode();

      // Initial order: node1, node2, node3
      expect(root.children().map((n) => n.id)).toEqual([
        node1.id,
        node2.id,
        node3.id,
      ]);

      // Move node3 before node2
      node3.moveBefore(node2);
      expect(root.children().map((n) => n.id)).toEqual([
        node1.id,
        node3.id,
        node2.id,
      ]);

      // Move node1 after node3
      node1.moveAfter(node3);
      expect(root.children().map((n) => n.id)).toEqual([
        node3.id,
        node1.id,
        node2.id,
      ]);
    });
  });

  describe("MobX Reactivity", () => {
    it("should trigger reactions on tree changes", () => {
      const { pool, doc } = createTestPool();
      const loroTree = doc.getTree("tree");
      const observableTree = pool.get(loroTree);

      // Create initial nodes
      const root1 = observableTree.createNode();
      root1.createNode();
      root1.createNode();

      // Track tree changes with MobX
      const rootCounts: number[] = [];
      const disposer = reaction(
        () => observableTree.roots().length,
        (count) => rootCounts.push(count),
      );

      // Should not trigger initially
      expect(rootCounts).toHaveLength(0);

      // Add another root
      observableTree.createNode();
      expect(rootCounts).toHaveLength(1);
      expect(rootCounts[0]).toBe(2);

      // Delete a root
      observableTree.delete(root1.id);
      expect(rootCounts).toHaveLength(2);
      expect(rootCounts[1]).toBe(1);

      disposer();
    });

    it("should track node data changes", () => {
      const { pool, doc } = createTestPool();
      const loroTree = doc.getTree("tree");
      const observableTree = pool.get(loroTree);

      const node = observableTree.createNode();
      node.data.set("count", 0);

      const counts: number[] = [];
      const disposer = autorun(() => {
        const count = node.data.get("count");
        if (count !== undefined && typeof count === "number") {
          counts.push(count);
        }
      });

      // Initial run
      expect(counts).toEqual([0]);

      // Update data
      node.data.set("count", 1);
      expect(counts).toEqual([0, 1]);

      node.data.set("count", 2);
      expect(counts).toEqual([0, 1, 2]);

      disposer();
    });

    it("should track complex tree restructuring", () => {
      const { pool, doc } = createTestPool();
      const loroTree = doc.getTree("tree");
      const observableTree = pool.get(loroTree);

      // Create a complex tree
      const root1 = observableTree.createNode();
      const root2 = observableTree.createNode();
      const a = root1.createNode();
      const b = root1.createNode();
      const c = a.createNode();
      b.createNode();

      // Track structure changes
      const structures: string[] = [];
      const disposer = autorun(() => {
        const structure = observableTree
          .roots()
          .map((root) => {
            const children = root
              .children()
              .map((child) => child.children().length);
            return `${root.children().length}:[${children.join(",")}]`;
          })
          .join(" ");
        structures.push(structure);
      });

      // Initial structure: root1 has 2 children (a,b), root2 has 0
      expect(structures).toEqual(["2:[1,1] 0:[]"]);

      // Move subtree b to root2
      b.move(root2);
      expect(structures).toEqual(["2:[1,1] 0:[]", "1:[1] 1:[1]"]);

      // Move c to be a sibling of a (under root1)
      c.move(root1);
      expect(structures).toEqual([
        "2:[1,1] 0:[]",
        "1:[1] 1:[1]",
        "2:[0,0] 1:[1]",
      ]);

      disposer();
    });

    it("should clean up observers when not being observed", () => {
      const { pool, doc } = createTestPool();
      const loroTree = doc.getTree("tree");
      const observableTree = pool.get(loroTree);

      observableTree.createNode();

      let observedRootCount = 0;
      const disposer = reaction(
        () => observableTree.roots().length,
        () => {
          observedRootCount++;
        },
      );

      // Trigger a change
      observableTree.createNode();
      expect(observedRootCount).toBe(1);

      // Dispose the reaction
      disposer();

      // Further changes should not be observed
      observableTree.createNode();
      expect(observedRootCount).toBe(1); // Should not change
    });
  });

  describe("Node Wrapper Management", () => {
    it("should reuse node wrappers", () => {
      const { pool, doc } = createTestPool();
      const loroTree = doc.getTree("tree");
      const observableTree = pool.get(loroTree);

      const root = observableTree.createNode();
      const child = root.createNode();

      // Getting the same node multiple times should return the same wrapper
      const node1 = observableTree.getNodeByID(child.id);
      const node2 = observableTree.getNodeByID(child.id);
      const node3 = root.children()[0];

      expect(node1).toBe(node2);
      expect(node1).toBe(node3);
    });

    it("should maintain stable node wrapper instances across remote changes", async () => {
      const { doc: doc1, pool: pool1 } = createTestPool();
      const { doc: doc2, pool: pool2 } = createTestPool();

      const loroTree1 = doc1.getTree("tree");
      const loroTree2 = doc2.getTree("tree");
      const observableTree1 = pool1.get(loroTree1);
      const observableTree2 = pool2.get(loroTree2);

      // Create initial structure in doc1
      const root1 = observableTree1.createNode();
      const child1 = root1.createNode();

      // Sync to doc2
      const update1 = doc1.export({ mode: "update" });
      doc2.import(update1);

      // Get references to nodes in doc2
      const root2 = observableTree2.roots()[0];
      const child2 = root2.children()[0];

      // Store the wrapper instances
      const originalRoot2Instance = root2;
      const originalChild2Instance = child2;

      // Make changes in doc1
      child1.createNode(); // Add a grandchild
      const update2 = doc1.export({ mode: "update" });
      doc2.import(update2);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Get the nodes again
      const root2AfterUpdate = observableTree2.roots()[0];
      const child2AfterUpdate = root2AfterUpdate.children()[0];

      // Verify that the wrapper instances are the same
      expect(root2AfterUpdate).toBe(originalRoot2Instance);
      expect(child2AfterUpdate).toBe(originalChild2Instance);

      // But the underlying node should be updated
      expect(child2AfterUpdate.children().length).toBe(1);
    });
  });

  describe("Remote Changes", () => {
    it("should handle basic remote changes", async () => {
      const { doc: doc1, pool: pool1 } = createTestPool();
      const { doc: doc2, pool: pool2 } = createTestPool();

      const loroTree1 = doc1.getTree("tree");
      const loroTree2 = doc2.getTree("tree");
      const observableTree1 = pool1.get(loroTree1);
      const observableTree2 = pool2.get(loroTree2);

      const handler = vi.fn();
      const unsubscribe = observableTree2.original.subscribe(handler);

      // Make changes in doc1
      const root = observableTree1.createNode();
      root.createNode();

      // Sync the change to doc2
      const update = doc1.export({ mode: "update" });
      doc2.import(update);

      // The handler should be called for the remote change
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(handler).toHaveBeenCalledTimes(1);

      // Check that the tree structure is synced
      expect(observableTree2.roots()).toHaveLength(1);
      expect(observableTree2.roots()[0].children()).toHaveLength(1);

      unsubscribe();
    });

    it("should trigger reactions on remote changes", async () => {
      const { doc: doc1, pool: pool1 } = createTestPool();
      const { doc: doc2, pool: pool2 } = createTestPool();

      const loroTree1 = doc1.getTree("tree");
      const loroTree2 = doc2.getTree("tree");
      const observableTree1 = pool1.get(loroTree1);
      const observableTree2 = pool2.get(loroTree2);

      // Create a node in doc1
      observableTree1.createNode();

      // Sync to doc2
      const update1 = doc1.export({ mode: "update" });
      doc2.import(update1);

      // Track root count in doc2
      const rootCounts: number[] = [];
      const disposer = autorun(() => {
        rootCounts.push(observableTree2.roots().length);
      });

      // Initial state
      expect(rootCounts).toEqual([1]);

      // Add another root in doc1
      observableTree1.createNode();
      const update2 = doc1.export({ mode: "update" });
      doc2.import(update2);

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(rootCounts).toEqual([1, 2]);

      disposer();
    });

    it("should handle remote changes on node structure and movement", async () => {
      const { doc: doc1, pool: pool1 } = createTestPool();
      const { doc: doc2, pool: pool2 } = createTestPool();

      const loroTree1 = doc1.getTree("tree");
      const loroTree2 = doc2.getTree("tree");
      const observableTree1 = pool1.get(loroTree1);
      const observableTree2 = pool2.get(loroTree2);

      // Create initial structure in doc1
      const root1 = observableTree1.createNode();
      const child1 = root1.createNode();

      // Sync to doc2
      const update1 = doc1.export({ mode: "update" });
      doc2.import(update1);

      // Track changes on a specific node in doc2
      const childStates: {
        childCount: number;
        parentId: string | null;
        rootCount: number;
      }[] = [];
      const disposer = autorun(() => {
        // Track root count to ensure we're detecting tree-level changes
        const rootCount = observableTree2.roots().length;
        // Always access nodes through the tree to get fresh instances
        const root2 = observableTree2.roots()[0];
        const child2 = root2?.children()[0];
        if (child2) {
          childStates.push({
            childCount: child2.children().length,
            parentId: child2.parent()?.id ?? null,
            rootCount,
          });
        } else if (rootCount > 1) {
          // If child2 is not in root2 anymore, check if it moved to another root
          const root3 = observableTree2.roots()[1];
          const movedChild = root3?.children()[0];
          if (movedChild) {
            childStates.push({
              childCount: movedChild.children().length,
              parentId: movedChild.parent()?.id ?? null,
              rootCount,
            });
          }
        }
      });

      // Initial state
      const root2Id = observableTree2.roots()[0].id;
      expect(childStates).toEqual([
        { childCount: 0, parentId: root2Id, rootCount: 1 },
      ]);

      // Add a grandchild in doc1
      child1.createNode();
      const update2 = doc1.export({ mode: "update" });
      doc2.import(update2);

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(childStates).toEqual([
        { childCount: 0, parentId: root2Id, rootCount: 1 },
        { childCount: 1, parentId: root2Id, rootCount: 1 },
      ]);

      // Create a new root and move child1 to it in doc1
      const newRoot1 = observableTree1.createNode();
      child1.move(newRoot1);
      const update3 = doc1.export({ mode: "update" });
      doc2.import(update3);

      await new Promise((resolve) => setTimeout(resolve, 10));
      const newRoot2Id = observableTree2.roots()[1].id;
      expect(childStates).toEqual([
        { childCount: 0, parentId: root2Id, rootCount: 1 },
        { childCount: 1, parentId: root2Id, rootCount: 1 },
        { childCount: 1, parentId: newRoot2Id, rootCount: 2 },
      ]);

      disposer();
    });

    it("should handle remote changes on node data", async () => {
      const { doc: doc1, pool: pool1 } = createTestPool();
      const { doc: doc2, pool: pool2 } = createTestPool();

      const loroTree1 = doc1.getTree("tree");
      const loroTree2 = doc2.getTree("tree");
      const observableTree1 = pool1.get(loroTree1);
      const observableTree2 = pool2.get(loroTree2);

      // Create a node in doc1
      const node1 = observableTree1.createNode();
      node1.data.set("count", 0);

      // Sync to doc2
      const update1 = doc1.export({ mode: "update" });
      doc2.import(update1);

      // Get the corresponding node in doc2
      const node2 = observableTree2.roots()[0];

      // Track data changes
      const counts: (number | undefined)[] = [];
      const disposer = autorun(() => {
        counts.push(node2.data.get("count") as number | undefined);
      });

      // Initial state
      expect(counts).toEqual([0]);

      // Update data in doc1
      node1.data.set("count", 1);
      const update2 = doc1.export({ mode: "update" });
      doc2.import(update2);

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(counts).toEqual([0, 1]);

      // Update again
      node1.data.set("count", 2);
      const update3 = doc1.export({ mode: "update" });
      doc2.import(update3);

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(counts).toEqual([0, 1, 2]);

      disposer();
    });

    it("should handle remote node deletions", async () => {
      const { doc: doc1, pool: pool1 } = createTestPool();
      const { doc: doc2, pool: pool2 } = createTestPool();

      const loroTree1 = doc1.getTree("tree");
      const loroTree2 = doc2.getTree("tree");
      const observableTree1 = pool1.get(loroTree1);
      const observableTree2 = pool2.get(loroTree2);

      // Create nodes in doc1
      const root1 = observableTree1.createNode();
      const child1 = root1.createNode();
      child1.createNode();

      // Sync to doc2
      const update1 = doc1.export({ mode: "update" });
      doc2.import(update1);

      // Get the node IDs to track them even after deletion
      const root2 = observableTree2.roots()[0];
      const child2Id = root2.children()[0].id;
      const grandchild2Id = root2.children()[0].children()[0].id;

      // Track deletion states
      const deletionStates: {
        childDeleted: boolean;
        grandchildDeleted: boolean;
      }[] = [];
      const disposer = autorun(() => {
        // Get nodes by ID to check deletion status
        const child2 = observableTree2.getNodeByID(child2Id);
        const grandchild2 = observableTree2.getNodeByID(grandchild2Id);
        if (child2 && grandchild2) {
          deletionStates.push({
            childDeleted: child2.isDeleted(),
            grandchildDeleted: grandchild2.isDeleted(),
          });
        }
      });

      // Initial state
      expect(deletionStates).toEqual([
        { childDeleted: false, grandchildDeleted: false },
      ]);

      // Delete child in doc1 (which should also delete grandchild)
      observableTree1.delete(child1.id);
      const update2 = doc1.export({ mode: "update" });
      doc2.import(update2);

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(deletionStates).toEqual([
        { childDeleted: false, grandchildDeleted: false },
        { childDeleted: true, grandchildDeleted: true },
      ]);

      disposer();
    });

    it("should handle nodes created remotely", async () => {
      const { doc: doc1, pool: pool1 } = createTestPool();
      const { doc: doc2, pool: pool2 } = createTestPool();

      const loroTree1 = doc1.getTree("tree");
      const loroTree2 = doc2.getTree("tree");
      const observableTree1 = pool1.get(loroTree1);
      const observableTree2 = pool2.get(loroTree2);

      // Create initial structure in doc1
      const root1 = observableTree1.createNode();

      // Sync to doc2
      const update1 = doc1.export({ mode: "update" });
      doc2.import(update1);

      // Access only the root in doc2 (not its future children)
      const root2 = observableTree2.roots()[0];
      expect(root2.children().length).toBe(0);

      // Add children in doc1
      root1.createNode();
      root1.createNode();
      const update2 = doc1.export({ mode: "update" });
      doc2.import(update2);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Now access the children that were created remotely
      expect(root2.children().length).toBe(2);
      const child1 = root2.children()[0];
      const child2 = root2.children()[1];

      // These should be new wrapper instances
      expect(child1).toBeDefined();
      expect(child2).toBeDefined();

      // Test that we can interact with them normally
      expect(child1.parent()?.id).toBe(root2.id);
      expect(child2.parent()?.id).toBe(root2.id);
    });
  });
});
