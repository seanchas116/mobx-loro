import { describe, it, expect } from "vitest";
import { createTestPool } from "./test-helpers";

describe("ObservableLoroPool property access", () => {
  it("should have pool property on all observable wrappers", () => {
    const { pool, doc } = createTestPool();

    // Test ObservableLoroMap
    const loroMap = doc.getMap("test-map");
    const map = pool.get(loroMap);
    expect(map.pool).toBe(pool);

    // Test ObservableLoroTree
    const loroTree = doc.getTree("test-tree");
    const tree = pool.get(loroTree);
    expect(tree.pool).toBe(pool);

    // Test ObservableLoroList
    const loroList = doc.getList("test-list");
    const list = pool.get(loroList);
    expect(list.pool).toBe(pool);

    // Test ObservableMovableList
    const loroMovableList = doc.getMovableList("test-movable");
    const movableList = pool.get(loroMovableList);
    expect(movableList.pool).toBe(pool);
  });

  it("should allow accessing other containers through pool property", () => {
    const { pool, doc } = createTestPool();

    // Create a map
    const loroMapUserData = doc.getMap("user-data");
    const map = pool.get(loroMapUserData);
    map.set("name", "John");

    // Create a list that can access the map through its pool property
    const loroListActions = doc.getList("user-actions");
    const list = pool.get(loroListActions);

    // Access the map through the list's pool property
    const sameMap = list.pool.get(loroMapUserData);
    expect(sameMap).toBe(map); // Should be the same instance
    expect(sameMap.get("name")).toBe("John");
  });

  it("should work with nested container creation", () => {
    const { pool, doc } = createTestPool();

    // Create a tree
    const loroTree = doc.getTree("my-tree");
    const tree = pool.get(loroTree);
    const rootNode = tree.createNode();

    // The node's data should have access to the same pool
    expect(rootNode.data.pool).toBe(pool);

    // Should be able to create other containers from within the tree node
    const loroListRelated = doc.getList("related-items");
    const relatedList = rootNode.data.pool.get(loroListRelated);
    relatedList.push("item1");

    // Verify it's the same instance when accessed directly
    const directList = pool.get(loroListRelated);
    expect(directList).toBe(relatedList);
    expect(directList.toArray()).toEqual(["item1"]);
  });
});
