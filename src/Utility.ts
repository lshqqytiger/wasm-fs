import { AssertionError } from "./Error";

export function assert(r: boolean): asserts r {
  if (!r) throw new AssertionError();
}
