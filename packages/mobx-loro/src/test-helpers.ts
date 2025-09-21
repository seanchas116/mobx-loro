import { LoroDoc } from "loro-crdt";
import { ObservableLoroPool } from "./pool";

/**
 * Create a test helper that provides a LoroDoc and ObservableLoroPool for testing
 */
export function createTestPool() {
  const doc = new LoroDoc();
  const pool = new ObservableLoroPool(doc);

  return { doc, pool };
}
