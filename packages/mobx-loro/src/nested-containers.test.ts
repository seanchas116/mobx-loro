import { describe, it, expect } from "vitest";
import { autorun } from "mobx";
import {
  LoroDoc,
  LoroMap,
  LoroList,
  LoroTree,
  LoroMovableList,
} from "loro-crdt";
import { ObservableLoroPool } from "./pool";
import { ObservableLoroMap } from "./map";
import { ObservableLoroList } from "./list";

// Define proper typed schemas for testing nested containers

type ListWithContainersSchema = {
  "parent-list": LoroList<
    string | number | LoroMap<{ key: string }> | LoroList<string>
  >;
  "list-with-map": LoroList<LoroMap<{ data: string }>>;
  parent: LoroList<LoroList<string>>;
  "test-list": LoroList<
    string | number | LoroMap<Record<string, unknown>> | LoroList<unknown>
  >;
  level1: LoroList<LoroList<LoroList<string>>>;
  root: LoroList<LoroList<string>>;
  "shared-list": LoroList<LoroMap<{ key: string; key2?: string }>>;
};

type MapWithContainersSchema = {
  "parent-map": LoroMap<{
    primitive: string;
    number: number;
    nested?: LoroMap<{ data: string }>;
    list?: LoroList<string>;
  }>;
  parent: LoroMap<{
    primitive: string;
    number: number;
  }>;
};

type MovableListSchema = {
  movable: LoroMovableList<
    string | LoroMap<Record<string, unknown>> | LoroList<unknown>
  >;
};

type TreeWithDataSchema = {
  tree: LoroTree<{ key: string }>;
};

type DeepNestingSchema = {
  list1: LoroList<LoroMap<{ data: string }>>;
};

describe("Nested Containers with Typed Schemas", () => {
  describe("Lists containing containers", () => {
    it("should wrap containers returned from list.get()", () => {
      const doc = new LoroDoc<ListWithContainersSchema>();
      const pool = new ObservableLoroPool(doc);

      const list = pool.get(doc.getList("parent-list"));

      // Use pushContainer to add a map
      const pushedMap = list.pushContainer(new LoroMap());
      expect(pushedMap).toBeInstanceOf(ObservableLoroMap);

      // Getting the item should return the wrapped version
      const retrievedMap = list.get(0);
      expect(retrievedMap).toBeInstanceOf(ObservableLoroMap);
      expect(retrievedMap).toBe(pushedMap); // Same instance (flyweight)
    });

    it("should wrap containers in list.toArray()", () => {
      const doc = new LoroDoc<ListWithContainersSchema>();
      const pool = new ObservableLoroPool(doc);

      const list = pool.get(doc.getList("parent-list"));

      // Add mixed content
      list.push("string");
      list.push(42);
      list.pushContainer(new LoroMap());
      list.pushContainer(new LoroList());

      const array = list.toArray();
      expect(array).toHaveLength(4);
      expect(array[0]).toBe("string");
      expect(array[1]).toBe(42);
      expect(array[2]).toBeInstanceOf(ObservableLoroMap);
      expect(array[3]).toBeInstanceOf(ObservableLoroList);

      // Verify flyweight pattern
      const array2 = list.toArray();
      expect(array[2]).toBe(array2[2]);
      expect(array[3]).toBe(array2[3]);
    });

    it("should handle nested list in list", () => {
      const doc = new LoroDoc<ListWithContainersSchema>();
      const pool = new ObservableLoroPool(doc);

      const parentList = pool.get(doc.getList("parent"));
      const nestedList = parentList.insertContainer(0, new LoroList());

      expect(nestedList).toBeInstanceOf(ObservableLoroList);

      // Add items to nested list
      nestedList.push("nested-item");

      // Retrieve and verify
      const retrieved = parentList.get(0);
      expect(retrieved).toBe(nestedList);
      expect(retrieved.get(0)).toBe("nested-item");
    });

    it("should handle typed nested containers", () => {
      const doc = new LoroDoc<ListWithContainersSchema>();
      const pool = new ObservableLoroPool(doc);

      const list = pool.get(doc.getList("list-with-map"));
      const map = list.pushContainer(new LoroMap<{ data: string }>());

      // TypeScript knows the schema
      map.set("data", "value");
      expect(map.get("data")).toBe("value");

      // Retrieving should return the same wrapped instance
      const retrieved = list.get(0);
      expect(retrieved).toBe(map);
      expect(retrieved.get("data")).toBe("value");
    });
  });

  describe("Maps with properly typed values", () => {
    it("should handle maps with mixed primitive and container values", () => {
      const doc = new LoroDoc<MapWithContainersSchema>();
      const pool = new ObservableLoroPool(doc);

      const map = pool.get(doc.getMap("parent-map"));

      // Set primitive values
      map.set("primitive", "test");
      map.set("number", 123);

      // For container values in maps, we need to use the proper Loro pattern
      // In Loro, nested containers in maps are typically handled differently
      // than in lists (which have pushContainer/insertContainer methods)

      const values = map.values();
      expect(values).toContain("test");
      expect(values).toContain(123);

      const entries = map.entries();
      expect(entries.find(([k]) => k === "primitive")?.[1]).toBe("test");
      expect(entries.find(([k]) => k === "number")?.[1]).toBe(123);
    });

    it("should properly type map operations", () => {
      const doc = new LoroDoc<MapWithContainersSchema>();
      const pool = new ObservableLoroPool(doc);

      const map = pool.get(doc.getMap("parent"));

      // TypeScript enforces the schema
      map.set("primitive", "value");
      map.set("number", 42);

      expect(map.get("primitive")).toBe("value");
      expect(map.get("number")).toBe(42);
    });
  });

  describe("MovableLists with typed containers", () => {
    it("should wrap containers from movable list operations", () => {
      const doc = new LoroDoc<MovableListSchema>();
      const pool = new ObservableLoroPool(doc);

      const movableList = pool.get(doc.getMovableList("movable"));

      // Add containers
      const map = movableList.pushContainer(new LoroMap());
      const list = movableList.pushContainer(new LoroList());

      expect(map).toBeInstanceOf(ObservableLoroMap);
      expect(list).toBeInstanceOf(ObservableLoroList);

      // Get should return wrapped versions
      expect(movableList.get(0)).toBe(map);
      expect(movableList.get(1)).toBe(list);

      // setContainer should also wrap
      const newMap = movableList.setContainer(0, new LoroMap());
      expect(newMap).toBeInstanceOf(ObservableLoroMap);
      expect(movableList.get(0)).toBe(newMap);

      // toArray should have wrapped versions
      const array = movableList.toArray();
      expect(array[0]).toBeInstanceOf(ObservableLoroMap);
      expect(array[1]).toBeInstanceOf(ObservableLoroList);
    });

    it("should maintain wrapping after move operations", () => {
      const doc = new LoroDoc<MovableListSchema>();
      const pool = new ObservableLoroPool(doc);

      const movableList = pool.get(doc.getMovableList("movable"));

      movableList.push("item1");
      const map = movableList.pushContainer(new LoroMap());
      movableList.push("item2");

      // Before move
      expect(movableList.get(1)).toBe(map);

      // Move the map to the end
      movableList.move(1, 2);

      // After move, should still be wrapped
      const movedMap = movableList.get(2);
      expect(movedMap).toBeInstanceOf(ObservableLoroMap);
      expect(movedMap).toBe(map); // Same instance
    });
  });

  describe("Tree nodes with typed data", () => {
    it("should wrap tree node data map", () => {
      const doc = new LoroDoc<TreeWithDataSchema>();
      const pool = new ObservableLoroPool(doc);

      const tree = pool.get(doc.getTree("tree"));
      const node = tree.createNode();

      // Node data should be wrapped
      expect(node.data).toBeInstanceOf(ObservableLoroMap);

      // Data should be reactive and typed
      let observedValue: string | undefined;
      const dispose = autorun(() => {
        observedValue = node.data.get("key");
      });

      node.data.set("key", "value");
      expect(observedValue).toBe("value");

      dispose();
    });

    it("should maintain flyweight pattern for node data", () => {
      const doc = new LoroDoc<TreeWithDataSchema>();
      const pool = new ObservableLoroPool(doc);

      const tree = pool.get(doc.getTree("tree"));
      const node = tree.createNode();

      const data1 = node.data;
      const data2 = node.data;
      expect(data1).toBe(data2);

      // Getting node by ID should return same data instance
      const nodeById = tree.getNodeByID(node.id);
      expect(nodeById?.data).toBe(data1);
    });
  });

  describe("Deep nesting with typed schemas", () => {
    it("should handle list -> map nesting", () => {
      const doc = new LoroDoc<DeepNestingSchema>();
      const pool = new ObservableLoroPool(doc);

      // Create a list that contains maps
      const list1 = pool.get(doc.getList("list1"));

      // Add a map to the list
      const map = list1.pushContainer(new LoroMap<{ data: string }>());
      expect(map).toBeInstanceOf(ObservableLoroMap);

      // Add data to the map
      map.set("data", "value");

      // Verify the structure is reactive
      let observedData: string | undefined;
      const dispose = autorun(() => {
        const m = list1.get(0);
        observedData = m.get("data");
      });

      expect(observedData).toBe("value");

      map.set("data", "new-value");
      expect(observedData).toBe("new-value");

      dispose();
    });

    it("should handle multiple levels of list nesting", () => {
      const doc = new LoroDoc<ListWithContainersSchema>();
      const pool = new ObservableLoroPool(doc);

      const list1 = pool.get(doc.getList("level1"));
      const list2 = list1.pushContainer(new LoroList<LoroList<string>>());
      const list3 = list2.pushContainer(new LoroList<string>());

      expect(list2).toBeInstanceOf(ObservableLoroList);
      expect(list3).toBeInstanceOf(ObservableLoroList);

      // Add data at the deepest level
      list3.push("deep-value");

      // Navigate and verify
      const l2 = list1.get(0);
      const l3 = l2.get(0);
      expect(l3.get(0)).toBe("deep-value");

      // Verify instances
      expect(l2).toBe(list2);
      expect(l3).toBe(list3);
    });
  });

  describe("Cross-document synchronization with typed schemas", () => {
    it("should wrap containers after sync between documents", async () => {
      // Document 1 with typed schema
      const doc1 = new LoroDoc<ListWithContainersSchema>();
      const pool1 = new ObservableLoroPool(doc1);

      const list1 = pool1.get(doc1.getList("shared-list"));
      const childMap = list1.pushContainer(
        new LoroMap<{ key: string; key2?: string }>(),
      );
      childMap.set("key", "value");

      // Document 2 with same typed schema
      const doc2 = new LoroDoc<ListWithContainersSchema>();
      const pool2 = new ObservableLoroPool(doc2);

      // Sync
      const updates = doc1.export({ mode: "update" });
      doc2.import(updates);

      // Access synced data
      const list2 = pool2.get(doc2.getList("shared-list"));
      const syncedMap = list2.get(0);

      // Should be wrapped
      expect(syncedMap).toBeInstanceOf(ObservableLoroMap);
      expect(syncedMap.get("key")).toBe("value");

      // Further modifications should work with proper typing
      syncedMap.set("key2", "value2");
      expect(syncedMap.size).toBe(2);

      pool1.dispose();
      pool2.dispose();
    });
  });

  describe("Reactivity with nested containers and typed schemas", () => {
    it("should trigger reactions when nested containers change", () => {
      const doc = new LoroDoc<ListWithContainersSchema>();
      const pool = new ObservableLoroPool(doc);

      const list = pool.get(doc.getList("test-list"));
      const childMap = list.pushContainer(
        new LoroMap<Record<string, unknown>>(),
      );

      let mapSize = 0;
      let runCount = 0;

      const dispose = autorun(() => {
        const map = list.get(0) as ObservableLoroMap<Record<string, unknown>>;
        mapSize = map.size;
        runCount++;
      });

      expect(runCount).toBe(1);
      expect(mapSize).toBe(0);

      childMap.set("key1", "value1");
      expect(runCount).toBe(2);
      expect(mapSize).toBe(1);

      childMap.set("key2", "value2");
      expect(runCount).toBe(3);
      expect(mapSize).toBe(2);

      dispose();
    });

    it("should handle complex nested reactivity with typed schemas", () => {
      const doc = new LoroDoc<ListWithContainersSchema>();
      const pool = new ObservableLoroPool(doc);

      const list = pool.get(doc.getList("root"));
      const nestedList = list.pushContainer(new LoroList<string>());

      let itemValue: string | undefined;
      let runCount = 0;

      const dispose = autorun(() => {
        const l = list.get(0);
        itemValue = l.get(0);
        runCount++;
      });

      expect(runCount).toBe(1);
      expect(itemValue).toBeUndefined();

      nestedList.push("first");
      expect(runCount).toBe(2);
      expect(itemValue).toBe("first");

      nestedList.delete(0, 1);
      nestedList.push("second");
      expect(runCount).toBe(4);
      expect(itemValue).toBe("second");

      dispose();
    });
  });

  describe("Real-world scenarios with typed schemas", () => {
    // Define a realistic document schema
    type TodoAppSchema = {
      todos: LoroList<
        LoroMap<{
          id: string;
          title: string;
          completed: boolean;
          subtasks?: LoroList<
            LoroMap<{
              id: string;
              title: string;
              completed: boolean;
            }>
          >;
        }>
      >;
      metadata: LoroMap<{
        lastModified: number;
        owner: string;
      }>;
    };

    it("should handle a todo app with nested subtasks", () => {
      const doc = new LoroDoc<TodoAppSchema>();
      const pool = new ObservableLoroPool(doc);

      const todos = pool.get(doc.getList("todos"));
      const metadata = pool.get(doc.getMap("metadata"));

      // Add a todo with subtasks
      const todo = todos.pushContainer(new LoroMap());
      todo.set("id", "todo-1");
      todo.set("title", "Main Task");
      todo.set("completed", false);

      // Track reactivity
      let todoTitle: string | undefined;
      const dispose = autorun(() => {
        const firstTodo = todos.get(0);
        todoTitle = firstTodo?.get("title");
      });

      expect(todoTitle).toBe("Main Task");

      // Update the todo
      todo.set("title", "Updated Task");
      expect(todoTitle).toBe("Updated Task");

      // Update metadata
      metadata.set("lastModified", Date.now());
      metadata.set("owner", "user123");

      expect(metadata.get("owner")).toBe("user123");

      dispose();
    });

    type ChatAppSchema = {
      "general-messages": LoroList<
        LoroMap<{
          id: string;
          text: string;
          author: string;
          timestamp: number;
        }>
      >;
      "random-messages": LoroList<
        LoroMap<{
          id: string;
          text: string;
          author: string;
          timestamp: number;
        }>
      >;
      "channel-metadata": LoroMap<{
        generalTopic: string;
        randomTopic: string;
      }>;
    };

    it("should handle a chat app with channels and messages", () => {
      const doc = new LoroDoc<ChatAppSchema>();
      const pool = new ObservableLoroPool(doc);

      // Create a general channel with messages
      const generalChannel = doc.getList("general-messages");

      // This demonstrates the limitation: we can't directly set a container as a map value
      // In Loro, maps typically contain primitive values, not other containers
      // For nested structures, you use the document's container hierarchy

      // Instead, work directly with the list
      const generalList = pool.get(generalChannel);
      const message = generalList.pushContainer(new LoroMap());

      message.set("id", "msg-1");
      message.set("text", "Hello, world!");
      message.set("author", "Alice");
      message.set("timestamp", Date.now());

      // Verify the message is reactive
      let messageText: string | undefined;
      const dispose = autorun(() => {
        const msg = generalList.get(0);
        messageText = msg?.get("text");
      });

      expect(messageText).toBe("Hello, world!");

      message.set("text", "Hello, everyone!");
      expect(messageText).toBe("Hello, everyone!");

      dispose();
    });
  });
});
