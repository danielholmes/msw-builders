import {
  http,
  DefaultBodyType,
  ResponseResolver,
  PathParams,
  ResponseResolverReturnType,
} from "msw";
import { HttpRequestResolverExtras } from "msw/lib/core/handlers/HttpHandler";
import {
  isEqual,
  isMatch,
  mapKeys,
  partial,
  trimEnd,
  trimStart,
} from "lodash-es";
import { diff } from "jest-diff";
import { consoleDebugLog, nullLogger } from "./debug";
import { extractBodyContent } from "./utils";

// NotFunction didn't work for me, maybe look into in future
// type NotFunction<T> = T extends Function ? never : T;
// type Matcher<T> = NotFunction<T> | ((value: T) => boolean);

type MatcherFunction = (value: unknown) => boolean;

type Matcher<T> = T | MatcherFunction;

type MatcherOptions<
  TSearchParams extends Record<string, string>,
  THeaders extends Record<string, string>,
> = {
  readonly searchParams?: Matcher<TSearchParams>;
  readonly headers?: Matcher<THeaders>;
};

type WithBodyMatcherOptions<
  TSearchParams extends Record<string, string>,
  THeaders extends Record<string, string>,
  RequestBodyType extends DefaultBodyType = DefaultBodyType,
> = MatcherOptions<TSearchParams, THeaders> & {
  readonly body?: Matcher<RequestBodyType>;
};

type HandlerOptions = {
  readonly onCalled?: () => void;
};

type Options = {
  readonly url: string;
  readonly debug?: boolean;
};

function matchMessage(
  type: string,
  method: string,
  url: string,
  expected: Matcher<unknown>,
  actual: unknown,
) {
  const difference =
    typeof expected === "function"
      ? `doesn't match function matcher`
      : diff(expected, actual);
  return `${method} ${url} ${type} differ\n${difference ?? ""}`;
}

function createFullUrl(baseUrl: string, path: string) {
  if (path === "") {
    return baseUrl;
  }
  return trimEnd(baseUrl, "/") + "/" + trimStart(path, "/");
}

function searchParamsToObject(searchParams: URLSearchParams) {
  const obj: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

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

function passesMatcherEqual<T>(matcher: Matcher<T>, value: unknown) {
  switch (typeof matcher) {
    case "function":
      return (matcher as unknown as MatcherFunction)(value);
    case "object":
      return isEqual(matcher, value);
    default:
      return true;
  }
}

function runMatchers<
  TSearchParams extends Record<string, string>,
  THeaders extends Record<string, string>,
  Params extends PathParams<keyof Params> = PathParams,
  // RequestBodyType extends DefaultBodyType = DefaultBodyType
>(
  { headers, searchParams }: MatcherOptions<TSearchParams, THeaders>,
  fullUrl: string,
  req: Request,
  debugLog: (message: string) => void,
) {
  // Headers. We want to allow other random headers, so we only do a contains match
  // We also want to match case-insensitively
  const actualHeaders = Object.fromEntries(req.headers.entries());
  if (
    headers !== undefined &&
    !passesMatcherContains(
      typeof headers === "object"
        ? mapKeys(headers, (_, k) => k.toLowerCase())
        : headers,
      mapKeys(actualHeaders, (_, k) => k.toLowerCase()),
    )
  ) {
    debugLog(matchMessage("headers", "POST", fullUrl, headers, actualHeaders));
    return false;
  }

  // Search params
  const actualSearchParams = searchParamsToObject(
    new URL(req.url).searchParams,
  );
  if (
    searchParams !== undefined &&
    !passesMatcherEqual(searchParams, actualSearchParams)
  ) {
    debugLog(
      matchMessage(
        "searchParams",
        "POST",
        fullUrl,
        searchParams,
        actualSearchParams,
      ),
    );
    return false;
  }

  return true;
}

function createRestHandlersFactory({ url, debug }: Options) {
  const debugLog = debug ? partial(consoleDebugLog, url) : nullLogger;
  return {
    get: <
      TSearchParams extends Record<string, string>,
      THeaders extends Record<string, string>,
      Params extends PathParams<keyof Params> = PathParams,
      ResponseBody extends DefaultBodyType = DefaultBodyType,
    >(
      path: string,
      matchers: MatcherOptions<TSearchParams, THeaders>,
      response: ResponseResolver<
        HttpRequestResolverExtras<Params>,
        never,
        ResponseBody
      >,
      options?: HandlerOptions,
    ) => {
      const fullUrl = createFullUrl(url, path);
      return http.get<Params, never, ResponseBody>(fullUrl, (info) => {
        const { onCalled } = options ?? {};

        if (!runMatchers(matchers, fullUrl, info.request, debugLog)) {
          return;
        }

        onCalled?.();
        return response(info);
      });
    },
    post: <
      TSearchParams extends Record<string, string>,
      THeaders extends Record<string, string>,
      RequestBodyType extends DefaultBodyType = DefaultBodyType,
      Params extends PathParams<keyof Params> = PathParams,
      ResponseBody extends DefaultBodyType = DefaultBodyType,
    >(
      path: string,
      matchers: WithBodyMatcherOptions<
        TSearchParams,
        THeaders,
        RequestBodyType
      >,
      response: (
        info: Parameters<
          ResponseResolver<
            HttpRequestResolverExtras<Params>,
            RequestBodyType,
            ResponseBody
          >
        >[0],
      ) =>
        | ResponseResolverReturnType<ResponseBody>
        | Promise<ResponseResolverReturnType<ResponseBody>>,
      options?: HandlerOptions,
    ) => {
      const fullUrl = createFullUrl(url, path);
      return http.post<Params, RequestBodyType, ResponseBody>(
        fullUrl,
        (info) => {
          const { body } = matchers;
          const { onCalled } = options ?? {};

          if (!runMatchers(matchers, fullUrl, info.request, debugLog)) {
            return undefined;
          }

          // Body
          return extractBodyContent(info.request).then((actualBody) => {
            if (body !== undefined && !passesMatcherEqual(body, actualBody)) {
              debugLog(matchMessage("body", "POST", fullUrl, body, actualBody));
              return undefined;
            }

            onCalled?.();
            return response(info);
          });
        },
      );
    },
  };
}

type RestHandlersFactory = ReturnType<typeof createRestHandlersFactory>;

export type { RestHandlersFactory };
export { createRestHandlersFactory };
