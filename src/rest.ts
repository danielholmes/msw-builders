import {
  rest,
  DefaultBodyType,
  ResponseResolver,
  RestContext,
  RestRequest,
  PathParams,
} from "msw";
import { isEqual, omit, partial, trimEnd, trimStart } from "lodash-es";
import { diff } from "jest-diff";
import { consoleDebugLog, nullLogger } from "./debug";

// NotFunction didn't work for me, maybe look into in future
// type NotFunction<T> = T extends Function ? never : T;
// type Matcher<T> = NotFunction<T> | ((value: T) => boolean);

type MatcherFunction = (value: unknown) => boolean;

type Matcher<T> = T | MatcherFunction;

type MatcherOptions<
  TSearchParams extends Record<string, string>,
  THeaders extends Record<string, string>
> = {
  readonly searchParams?: Matcher<TSearchParams>;
  readonly headers?: Matcher<THeaders>;
};

type WithBodyMatcherOptions<
  TSearchParams extends Record<string, string>,
  THeaders extends Record<string, string>,
  RequestBodyType extends DefaultBodyType = DefaultBodyType
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
  actual: unknown
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

function passesMatcher<T>(matcher: Matcher<T>, value: unknown) {
  if (
    typeof matcher === "function" &&
    !(matcher as unknown as MatcherFunction)(value)
  ) {
    return false;
  }

  if (typeof matcher === "object" && !isEqual(matcher, value)) {
    return false;
  }

  return true;
}

function runMatchers<
  TSearchParams extends Record<string, string>,
  THeaders extends Record<string, string>,
  Params extends PathParams<keyof Params> = PathParams,
  RequestBodyType extends DefaultBodyType = DefaultBodyType
>(
  { headers, searchParams }: MatcherOptions<TSearchParams, THeaders>,
  fullUrl: string,
  req: RestRequest<RequestBodyType, Params>,
  debugLog: (message: string) => void
) {
  // Headers
  const actualHeaders = omit(req.headers.all(), "content-type");
  if (headers !== undefined && !passesMatcher(headers, actualHeaders)) {
    debugLog(matchMessage("headers", "POST", fullUrl, headers, actualHeaders));
    return false;
  }

  // Search params
  const actualSearchParams = searchParamsToObject(req.url.searchParams);
  if (
    searchParams !== undefined &&
    !passesMatcher(searchParams, actualSearchParams)
  ) {
    debugLog(
      matchMessage(
        "searchParams",
        "POST",
        fullUrl,
        searchParams,
        actualSearchParams
      )
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
      ResponseBody extends DefaultBodyType = DefaultBodyType
    >(
      path: string,
      matchers: MatcherOptions<TSearchParams, THeaders>,
      response: ResponseResolver<
        RestRequest<never, Params>,
        RestContext,
        ResponseBody
      >,
      options?: HandlerOptions
    ) => {
      const fullUrl = createFullUrl(url, path);
      return rest.get<never, Params, ResponseBody>(fullUrl, (req, res, ctx) => {
        const { onCalled } = options ?? {};

        if (!runMatchers(matchers, fullUrl, req, debugLog)) {
          return;
        }

        onCalled?.();
        return response(req, res, ctx);
      });
    },
    post: <
      TSearchParams extends Record<string, string>,
      THeaders extends Record<string, string>,
      RequestBodyType extends DefaultBodyType = DefaultBodyType,
      Params extends PathParams<keyof Params> = PathParams,
      ResponseBody extends DefaultBodyType = DefaultBodyType
    >(
      path: string,
      matchers: WithBodyMatcherOptions<
        TSearchParams,
        THeaders,
        RequestBodyType
      >,
      response: ResponseResolver<
        RestRequest<RequestBodyType, Params>,
        RestContext,
        ResponseBody
      >,
      options?: HandlerOptions
    ) => {
      const fullUrl = createFullUrl(url, path);
      return rest.post<RequestBodyType, Params, ResponseBody>(
        fullUrl,
        (req, res, ctx) => {
          const { body } = matchers;
          const { onCalled } = options ?? {};

          if (!runMatchers(matchers, fullUrl, req, debugLog)) {
            return;
          }

          // Body
          const actualBody = typeof req.body === "object" ? req.body : {};
          if (body !== undefined && !passesMatcher(body, actualBody)) {
            debugLog(matchMessage("body", "POST", fullUrl, body, actualBody));
            return;
          }

          onCalled?.();
          return response(req, res, ctx);
        }
      );
    },
  };
}

type RestHandlersFactory = ReturnType<typeof createRestHandlersFactory>;

export type { RestHandlersFactory };
export { createRestHandlersFactory };
