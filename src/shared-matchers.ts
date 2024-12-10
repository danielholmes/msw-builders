import { mapKeys, isMatch } from "./utils.ts";

// NotFunction didn't work for me, maybe look into in future
// type NotFunction<T> = T extends Function ? never : T;
// type Matcher<T> = NotFunction<T> | ((value: T) => boolean);

type MatcherFunction = (value: unknown) => boolean;

type Matcher<T> = T | MatcherFunction;

function passesMatcherContains<T>(matcher: Matcher<T>, value: object) {
  if (
    typeof matcher === "function" &&
    !(matcher as unknown as MatcherFunction)(value)
  ) {
    return false;
  }

  if (!!matcher && typeof matcher === "object" && !isMatch(value, matcher)) {
    return false;
  }

  return true;
}

function matchHeaders<THeaders extends Record<string, string>>(
  expectedHeaders: Matcher<THeaders>,
  { headers }: Request,
) {
  // Headers. We want to allow other random headers, so we only do a contains match
  // We also want to match case-insensitively
  const actualHeaders = Object.fromEntries(headers.entries());
  return passesMatcherContains(
    typeof expectedHeaders === "object"
      ? mapKeys(expectedHeaders, (_, k) => k.toLowerCase())
      : expectedHeaders,
    mapKeys(actualHeaders, (_, k) => k.toLowerCase()),
  );
}

export type { Matcher, MatcherFunction };
export { matchHeaders };
