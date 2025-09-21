import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LoroDoc, LoroMap } from "loro-crdt";
import { ObservableLoroPool } from "./pool";
import { ObservableLoroMap } from "./map";
import { ObservableLoroTree } from "./tree";
import { ObservableLoroList } from "./list";
import { ObservableMovableList } from "./movable-list";
import { ObservableLoroText } from "./text";

describe("ObservableLoroPool", () => {
  let doc: LoroDoc;
  let pool: ObservableLoroPool;

  beforeEach(() => {
    doc = new LoroDoc();
    pool = new ObservableLoroPool(doc);
  });

  afterEach(() => {
    pool.dispose();
  });

  describe("Map instances", () => {
    it("should create and cache ObservableLoroMap instances", () => {
      const loroMap = doc.getMap("test-map");
      const map1 = pool.get(loroMap);
      const map2 = pool.get(loroMap);

      expect(map1).toBeInstanceOf(ObservableLoroMap);
      expect(map1).toBe(map2); // Same instance
      expect(pool.size).toBe(1);
      expect(pool.has("map", loroMap.id)).toBe(true);
    });

    it("should return different instances for different IDs", () => {
      const loroMap1 = doc.getMap("map1");
      const loroMap2 = doc.getMap("map2");
      const map1 = pool.get(loroMap1);
      const map2 = pool.get(loroMap2);

      expect(map1).not.toBe(map2);
      expect(pool.size).toBe(2);
    });

    it("should preserve data in cached instances", () => {
      const loroMap = doc.getMap("data-map");
      const map1 = pool.get(loroMap as LoroMap<{ count: number }>);
      map1.set("count", 42);

      const map2 = pool.get(loroMap);
      expect(map2.get("count")).toBe(42);
    });
  });

  describe("Tree instances", () => {
    it("should create and cache ObservableLoroTree instances", () => {
      const loroTree = doc.getTree("test-tree");
      const tree1 = pool.get(loroTree);
      const tree2 = pool.get(loroTree);

      expect(tree1).toBeInstanceOf(ObservableLoroTree);
      expect(tree1).toBe(tree2); // Same instance
      expect(pool.size).toBe(1);
      expect(pool.has("tree", loroTree.id)).toBe(true);
    });

    it("should preserve tree structure in cached instances", () => {
      const loroTree = doc.getTree("structure-tree");
      const tree1 = pool.get(loroTree);
      const root = tree1.createNode();
      const child = root.createNode();

      const tree2 = pool.get(loroTree);
      expect(tree2.roots()).toHaveLength(1);
      expect(tree2.roots()[0].children()).toHaveLength(1);
      // Check that the node IDs are the same
      expect(tree2.roots()[0].id).toBe(root.id);
      expect(tree2.roots()[0].children()[0].id).toBe(child.id);
    });
  });

  describe("List instances", () => {
    it("should create and cache ObservableLoroList instances", () => {
      const loroList = doc.getList("test-list");
      const list1 = pool.get(loroList);
      const list2 = pool.get(loroList);

      expect(list1).toBeInstanceOf(ObservableLoroList);
      expect(list1).toBe(list2); // Same instance
      expect(pool.size).toBe(1);
      expect(pool.has("list", loroList.id)).toBe(true);
    });

    it("should preserve list data in cached instances", () => {
      const loroList = doc.getList<string>("data-list");
      const list1 = pool.get(loroList);
      list1.push("item1");
      list1.push("item2");

      const list2 = pool.get(loroList);
      expect(list2.length).toBe(2);
      expect(list2.get(0)).toBe("item1");
      expect(list2.get(1)).toBe("item2");
    });
  });

  describe("MovableList instances", () => {
    it("should create and cache ObservableMovableList instances", () => {
      const loroMovableList = doc.getMovableList("test-movable");
      const list1 = pool.get(loroMovableList);
      const list2 = pool.get(loroMovableList);

      expect(list1).toBeInstanceOf(ObservableMovableList);
      expect(list1).toBe(list2); // Same instance
      expect(pool.size).toBe(1);
      expect(pool.has("movable", loroMovableList.id)).toBe(true);
    });

    it("should preserve movable list data in cached instances", () => {
      const loroMovableList = doc.getMovableList("data-movable");
      const list1 = pool.get(loroMovableList);
      list1.push(1);
      list1.push(2);
      list1.push(3);

      const list2 = pool.get(loroMovableList);
      expect(list2.length).toBe(3);
      expect(list2.get(0)).toBe(1);
      expect(list2.get(1)).toBe(2);
      expect(list2.get(2)).toBe(3);
    });
  });

  describe("Mixed container types", () => {
    it("should handle different container types with same ID", () => {
      // Get a map first
      const loroMap = doc.getMap("shared-id");
      const map = pool.get(loroMap);
      expect(map).toBeInstanceOf(ObservableLoroMap);

      // Try to get a tree with the same ID - Loro allows different container types with same ID
      const loroTree = doc.getTree("shared-id");
      const tree = pool.get(loroTree);
      expect(tree).toBeInstanceOf(ObservableLoroTree);
      expect(tree).not.toBe(map); // Different instances for different types
      expect(pool.size).toBe(2); // Both instances are cached
    });

    it("should maintain separate instances for different container types", () => {
      const loroMap = doc.getMap("map-container");
      const loroTree = doc.getTree("tree-container");
      const loroList = doc.getList("list-container");
      const loroMovable = doc.getMovableList("movable-container");

      const map = pool.get(loroMap);
      const tree = pool.get(loroTree);
      const list = pool.get(loroList);
      const movable = pool.get(loroMovable);

      expect(pool.size).toBe(4);
      expect(map).toBeInstanceOf(ObservableLoroMap);
      expect(tree).toBeInstanceOf(ObservableLoroTree);
      expect(list).toBeInstanceOf(ObservableLoroList);
      expect(movable).toBeInstanceOf(ObservableMovableList);
    });
  });

  describe("Instance management", () => {
    it("should clear specific instances", () => {
      const loroMap1 = doc.getMap("map1");
      const loroMap2 = doc.getMap("map2");
      const loroTree1 = doc.getTree("tree1");

      pool.get(loroMap1);
      pool.get(loroMap2);
      pool.get(loroTree1);

      expect(pool.size).toBe(3);

      pool.clearInstance("map", loroMap1.id);
      expect(pool.size).toBe(2);
      expect(pool.has("map", loroMap1.id)).toBe(false);
      expect(pool.has("map", loroMap2.id)).toBe(true);
      expect(pool.has("tree", loroTree1.id)).toBe(true);

      // Getting the cleared instance should create a new one
      const newMap = pool.get(loroMap1);
      expect(newMap).toBeInstanceOf(ObservableLoroMap);
      expect(pool.size).toBe(3);
    });

    it("should clear all instances", () => {
      const loroMap1 = doc.getMap("map1");
      const loroMap2 = doc.getMap("map2");
      const loroTree1 = doc.getTree("tree1");
      const loroList1 = doc.getList("list1");

      pool.get(loroMap1);
      pool.get(loroMap2);
      pool.get(loroTree1);
      pool.get(loroList1);

      expect(pool.size).toBe(4);

      pool.clearAll();
      expect(pool.size).toBe(0);
      expect(pool.has("map", loroMap1.id)).toBe(false);
      expect(pool.has("map", loroMap2.id)).toBe(false);
      expect(pool.has("tree", loroTree1.id)).toBe(false);
      expect(pool.has("list", loroList1.id)).toBe(false);
    });
  });

  describe("Generic get method", () => {
    it("should convert LoroMap to ObservableLoroMap", () => {
      const loroMap = doc.getMap("test-map");
      const observable = pool.get(loroMap);

      expect(observable).toBeInstanceOf(ObservableLoroMap);
      expect(observable).toBe(pool.get(loroMap)); // Should use the same instance
    });

    it("should convert LoroList to ObservableLoroList", () => {
      const loroList = doc.getList("test-list");
      const observable = pool.get(loroList);

      expect(observable).toBeInstanceOf(ObservableLoroList);
      expect(observable).toBe(pool.get(loroList));
    });

    it("should convert LoroTree to ObservableLoroTree", () => {
      const loroTree = doc.getTree("test-tree");
      const observable = pool.get(loroTree);

      expect(observable).toBeInstanceOf(ObservableLoroTree);
      expect(observable).toBe(pool.get(loroTree));
    });

    it("should convert LoroMovableList to ObservableMovableList", () => {
      const loroMovableList = doc.getMovableList("test-movable");
      const observable = pool.get(loroMovableList);

      expect(observable).toBeInstanceOf(ObservableMovableList);
      expect(observable).toBe(pool.get(loroMovableList));
    });

    it("should convert LoroText to ObservableLoroText", () => {
      const loroText = doc.getText("test-text");
      const observable = pool.get(loroText);

      expect(observable).toBeInstanceOf(ObservableLoroText);
      expect(observable).toBe(pool.get(loroText));
    });

    it("should pass through non-container values unchanged", () => {
      const plainObject = { foo: "bar" };
      const plainArray = [1, 2, 3];
      const plainString = "hello";
      const plainNumber = 42;
      const plainBoolean = true;
      const plainNull = null;
      const plainUndefined = undefined;

      expect(pool.get(plainObject)).toBe(plainObject);
      expect(pool.get(plainArray)).toBe(plainArray);
      expect(pool.get(plainString)).toBe(plainString);
      expect(pool.get(plainNumber)).toBe(plainNumber);
      expect(pool.get(plainBoolean)).toBe(plainBoolean);
      expect(pool.get(plainNull)).toBe(plainNull);
      expect(pool.get(plainUndefined)).toBe(plainUndefined);
    });

    it("should handle mixed types in arrays", () => {
      const loroMap = doc.getMap("mixed-map");
      const loroList = doc.getList("mixed-list");
      const plainValue = "plain";

      const mixedArray = [loroMap, plainValue, loroList, 42];

      // Process each item
      const processedArray = mixedArray.map((item) => pool.get(item));

      expect(processedArray[0]).toBeInstanceOf(ObservableLoroMap);
      expect(processedArray[1]).toBe("plain");
      expect(processedArray[2]).toBeInstanceOf(ObservableLoroList);
      expect(processedArray[3]).toBe(42);
    });

    it("should maintain pool caching when using get method", () => {
      const loroMap = doc.getMap("cached-map");

      // First call creates the instance
      const observable1 = pool.get(loroMap);
      expect(pool.size).toBe(1);

      // Second call returns the cached instance
      const observable2 = pool.get(loroMap);
      expect(observable1).toBe(observable2);
      expect(pool.size).toBe(1);

      // Direct getMap call should return the same instance
      const observable3 = pool.get(loroMap);
      expect(observable1).toBe(observable3);
      expect(pool.size).toBe(1);
    });
  });

  describe("Disposal", () => {
    it("should clean up on disposal", () => {
      const loroMap1 = doc.getMap("map1");
      const loroTree1 = doc.getTree("tree1");
      const loroList1 = doc.getList("list1");

      pool.get(loroMap1);
      pool.get(loroTree1);
      pool.get(loroList1);

      expect(pool.size).toBe(3);

      pool.dispose();
      expect(pool.size).toBe(0);
    });
  });

  describe("Remote changes", () => {
    it("should maintain same instances across remote changes", async () => {
      // Create another doc to simulate remote changes
      const doc2 = new LoroDoc();
      const pool2 = new ObservableLoroPool(doc2);

      // Create map in doc1
      const loroMap1 = doc.getMap("remote-map");
      const map1 = pool.get(loroMap1);
      map1.set("value", "initial");

      // Sync to doc2
      const updates = doc.exportFrom(doc2.version());
      doc2.import(updates);

      // Get map in doc2
      const loroMap2 = doc2.getMap("remote-map");
      const map2 = pool2.get(loroMap2);
      expect(map2.get("value")).toBe("initial");

      // Store the instance reference
      const map2Instance = map2;

      // Make change in doc1
      map1.set("value", "updated");

      // Sync again
      const updates2 = doc.exportFrom(doc2.version());
      doc2.import(updates2);

      // Get map again in doc2 - should be same instance
      const map2Again = pool2.get(loroMap2);
      expect(map2Again).toBe(map2Instance);
      expect(map2Again.get("value")).toBe("updated");

      pool2.dispose();
    });
  });
});
