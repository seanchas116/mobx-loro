import { describe, it, expect } from "vitest";
import { autorun } from "mobx";
import { LoroDoc, LoroText } from "loro-crdt";
import { ObservableLoroPool } from "./pool";
import { ObservableLoroText } from "./text";

describe("ObservableLoroText", () => {
  function createText(): {
    text: ObservableLoroText;
    pool: ObservableLoroPool;
  } {
    const doc = new LoroDoc();
    const pool = new ObservableLoroPool(doc);
    const loroText = doc.getText("content");
    const text = pool.get(loroText);
    return { text, pool };
  }

  it("should create an observable text", () => {
    const { text } = createText();
    expect(text).toBeInstanceOf(ObservableLoroText);
    expect(text.toString()).toBe("");
    expect(text.length).toBe(0);
  });

  it("should insert text", () => {
    const { text } = createText();

    text.insert(0, "Hello");
    expect(text.toString()).toBe("Hello");
    expect(text.length).toBe(5);

    text.insert(5, " World");
    expect(text.toString()).toBe("Hello World");
    expect(text.length).toBe(11);

    text.insert(5, " Beautiful");
    expect(text.toString()).toBe("Hello Beautiful World");
    expect(text.length).toBe(21);
  });

  it("should delete text", () => {
    const { text } = createText();

    text.insert(0, "Hello World");
    expect(text.toString()).toBe("Hello World");

    text.delete(5, 6); // Delete " World"
    expect(text.toString()).toBe("Hello");

    text.delete(0, 5); // Delete "Hello"
    expect(text.toString()).toBe("");
  });

  it("should provide reactive updates", () => {
    const { text } = createText();

    let observedText = "";
    let observedLength = 0;
    let runCount = 0;

    const dispose = autorun(() => {
      observedText = text.toString();
      observedLength = text.length;
      runCount++;
    });

    // Initial run
    expect(runCount).toBe(1);
    expect(observedText).toBe("");
    expect(observedLength).toBe(0);

    // Insert should trigger reaction
    text.insert(0, "Hello");
    expect(runCount).toBe(2);
    expect(observedText).toBe("Hello");
    expect(observedLength).toBe(5);

    // Another insert
    text.insert(5, " World");
    expect(runCount).toBe(3);
    expect(observedText).toBe("Hello World");
    expect(observedLength).toBe(11);

    // Delete should trigger reaction
    text.delete(5, 6);
    expect(runCount).toBe(4);
    expect(observedText).toBe("Hello");
    expect(observedLength).toBe(5);

    dispose();
  });

  it("should apply and get deltas", () => {
    const { text } = createText();

    // Apply delta to insert text
    text.applyDelta([{ insert: "Hello" }]);
    expect(text.toString()).toBe("Hello");

    // Apply delta to insert more text
    text.applyDelta([{ retain: 5 }, { insert: " World" }]);
    expect(text.toString()).toBe("Hello World");

    // Get delta
    const delta = text.toDelta();
    expect(delta).toEqual([{ insert: "Hello World" }]);
  });

  it("should handle complex delta operations", () => {
    const { text } = createText();

    text.insert(0, "The quick brown fox");

    // Replace "quick" with "slow"
    text.applyDelta([{ retain: 4 }, { delete: 5 }, { insert: "slow" }]);

    expect(text.toString()).toBe("The slow brown fox");
  });

  it("should export to JSON", () => {
    const { text } = createText();

    text.insert(0, "Hello World");
    const json = text.toJSON();

    expect(json).toBe("Hello World");
  });

  it("should handle concurrent edits", () => {
    const doc1 = new LoroDoc();
    const pool1 = new ObservableLoroPool(doc1);
    const text1 = pool1.get(doc1.getText("content"));

    const doc2 = new LoroDoc();
    const pool2 = new ObservableLoroPool(doc2);
    const text2 = pool2.get(doc2.getText("content"));

    // Make edits on doc1
    text1.insert(0, "Hello");

    // Make edits on doc2
    text2.insert(0, "World");

    // Sync documents
    const updates1 = doc1.export({ mode: "update" });
    const updates2 = doc2.export({ mode: "update" });

    doc1.import(updates2);
    doc2.import(updates1);

    // Both should have merged content
    // Order may vary due to CRDT resolution
    const result1 = text1.toString();
    const result2 = text2.toString();

    expect(result1).toBe(result2);
    expect(result1.includes("Hello")).toBe(true);
    expect(result1.includes("World")).toBe(true);
  });

  it("should return the same instance from pool", () => {
    const doc = new LoroDoc();
    const pool = new ObservableLoroPool(doc);
    const loroText = doc.getText("content");

    const text1 = pool.get(loroText);
    const text2 = pool.get(loroText);

    expect(text1).toBe(text2);
  });

  it("should provide access to underlying LoroText", () => {
    const { text } = createText();

    expect(text.original).toBeDefined();
    expect(text.original).toBeInstanceOf(LoroText);
  });

  it("should handle remote updates reactively", async () => {
    const doc1 = new LoroDoc();
    const pool1 = new ObservableLoroPool(doc1);
    const text1 = pool1.get(doc1.getText("content"));

    const doc2 = new LoroDoc();
    const pool2 = new ObservableLoroPool(doc2);
    const text2 = pool2.get(doc2.getText("content"));

    let observedText = "";
    let runCount = 0;

    const dispose = autorun(() => {
      observedText = text2.toString();
      runCount++;
    });

    expect(runCount).toBe(1);
    expect(observedText).toBe("");

    // Edit on doc1
    text1.insert(0, "Hello from doc1");

    // Sync to doc2
    const updates = doc1.export({ mode: "update" });
    doc2.import(updates);

    // Wait for the next tick for MobX to process the change
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should trigger reaction
    expect(runCount).toBe(2);
    expect(observedText).toBe("Hello from doc1");

    dispose();
    pool1.dispose();
    pool2.dispose();
  });
});
