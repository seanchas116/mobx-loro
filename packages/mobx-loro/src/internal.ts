/**
 * Internal symbol used by ObservableLoroPool to create observable instances.
 * This symbol is used as a method name on all observable classes to prevent
 * direct instantiation while allowing the pool to create instances.
 * @internal
 */
export const OBSERVABLE_LORO_INTERNAL_CREATE = Symbol(
  "ObservableLoroInternal.create",
);
