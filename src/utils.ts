import { differenceWith, isEqual } from "lodash-es";

function objectDiff(
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>
) {
  return Object.fromEntries(
    differenceWith(Object.entries(obj2), Object.entries(obj1), isEqual)
  );
}

export { objectDiff };
