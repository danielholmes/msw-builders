import {
  type StrictRequest,
  type HttpHandler,
  http,
  type DefaultBodyType,
  type ResponseResolver,
  type PathParams,
  type ResponseResolverReturnType,
  type RequestHandlerOptions,
} from "msw";
import { diff } from "jest-diff";
import { consoleDebugLog, nullLogger } from "./debug.ts";
import {
  extractBodyContent,
  partial,
  trimStart,
  trimEnd,
  isEqual,
} from "./utils.ts";
import type { Matcher, MatcherFunction } from "./shared-matchers.ts";
import { matchHeaders } from "./shared-matchers.ts";

// Can't use this import, so duplicating
// import { ResponseResolverInfo } from "msw/lib/core/handlers/RequestHandler";
type ResponseResolverInfo<
  ResolverExtraInfo extends Record<string, unknown>,
  RequestBodyType extends DefaultBodyType = DefaultBodyType,
> = {
  request: StrictRequest<RequestBodyType>;
  requestId: string;
} & ResolverExtraInfo;

// Not exported by msw
type HttpRequestResolverExtras<Params extends PathParams> = {
  params: Params;
  cookies: Record<string, string>;
};

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

type CallInfo = {
  readonly request: Request;
};

type HandlerOptions = {
  readonly onCalled?: (info: CallInfo) => void | Promise<void>;
};

type Options = {
  readonly url: string;
  readonly debug?: boolean;
  readonly defaultRequestHandlerOptions?: RequestHandlerOptions;
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

function passesMatcherEqual<T>(matcher: Matcher<T>, value: unknown) {
  // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
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
  request: Request,
  debugLog: (message: string) => void,
) {
  if (headers !== undefined && !matchHeaders(headers, request)) {
    const actualHeaders = Object.fromEntries(request.headers.entries());
    debugLog(matchMessage("headers", "_", fullUrl, headers, actualHeaders));
    return false;
  }

  // Search params
  const actualSearchParams = searchParamsToObject(
    new URL(request.url).searchParams,
  );
  if (
    searchParams !== undefined &&
    !passesMatcherEqual(searchParams, actualSearchParams)
  ) {
    debugLog(
      matchMessage(
        "searchParams",
        "_",
        fullUrl,
        searchParams,
        actualSearchParams,
      ),
    );
    return false;
  }

  return true;
}

type RestHandlersFactory = {
  post: <
    TSearchParams extends Record<string, string>,
    THeaders extends Record<string, string>,
    RequestBodyType extends DefaultBodyType = DefaultBodyType,
    Params extends PathParams<keyof Params> = PathParams,
    ResponseBody extends DefaultBodyType = DefaultBodyType,
  >(
    path: string,
    matchers: WithBodyMatcherOptions<TSearchParams, THeaders, RequestBodyType>,
    response: (
      info: ResponseResolverInfo<
        HttpRequestResolverExtras<Params>,
        RequestBodyType
      >,
    ) =>
      | ResponseResolverReturnType<ResponseBody>
      | Promise<ResponseResolverReturnType<ResponseBody>>,
    options?: HandlerOptions,
  ) => HttpHandler;
  put: <
    TSearchParams extends Record<string, string>,
    THeaders extends Record<string, string>,
    RequestBodyType extends DefaultBodyType = DefaultBodyType,
    Params extends PathParams<keyof Params> = PathParams,
    ResponseBody extends DefaultBodyType = DefaultBodyType,
  >(
    path: string,
    matchers: WithBodyMatcherOptions<TSearchParams, THeaders, RequestBodyType>,
    response: (
      info: ResponseResolverInfo<
        HttpRequestResolverExtras<Params>,
        RequestBodyType
      >,
    ) =>
      | ResponseResolverReturnType<ResponseBody>
      | Promise<ResponseResolverReturnType<ResponseBody>>,
    options?: HandlerOptions,
  ) => HttpHandler;
  patch: <
    TSearchParams extends Record<string, string>,
    THeaders extends Record<string, string>,
    RequestBodyType extends DefaultBodyType = DefaultBodyType,
    Params extends PathParams<keyof Params> = PathParams,
    ResponseBody extends DefaultBodyType = DefaultBodyType,
  >(
    path: string,
    matchers: WithBodyMatcherOptions<TSearchParams, THeaders, RequestBodyType>,
    response: (
      info: ResponseResolverInfo<
        HttpRequestResolverExtras<Params>,
        RequestBodyType
      >,
    ) =>
      | ResponseResolverReturnType<ResponseBody>
      | Promise<ResponseResolverReturnType<ResponseBody>>,
    options?: HandlerOptions,
  ) => HttpHandler;
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
  ) => HttpHandler;
  options: <
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
  ) => HttpHandler;
};

function createRestHandlersFactory({
  url,
  debug,
  defaultRequestHandlerOptions,
}: Options): RestHandlersFactory {
  const debugLog = debug ? partial(consoleDebugLog, url) : nullLogger;
  return {
    options: <
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
      const { onCalled, ...rest } = {
        ...defaultRequestHandlerOptions,
        ...options,
      };
      const fullUrl = createFullUrl(url, path);
      return http.options<Params, never, ResponseBody>(
        fullUrl,
        async (info) => {
          const { request } = info;
          if (!runMatchers(matchers, fullUrl, request, debugLog)) {
            return;
          }

          await onCalled?.({ request });
          return response(info);
        },
        rest,
      );
    },
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
      const { onCalled, ...rest } = {
        ...defaultRequestHandlerOptions,
        ...options,
      };
      const fullUrl = createFullUrl(url, path);
      return http.get<Params, never, ResponseBody>(
        fullUrl,
        async (info) => {
          const { request } = info;
          if (!runMatchers(matchers, fullUrl, request, debugLog)) {
            return;
          }

          await onCalled?.({
            get request() {
              return request.clone();
            },
          });
          return response(info);
        },
        rest,
      );
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
        info: ResponseResolverInfo<
          HttpRequestResolverExtras<Params>,
          RequestBodyType
        >,
        // Parameters<
        //   ResponseResolver<
        //     HttpRequestResolverExtras<Params>,
        //     RequestBodyType,
        //     ResponseBody
        //   >
        // >[0],
      ) =>
        | ResponseResolverReturnType<ResponseBody>
        | Promise<ResponseResolverReturnType<ResponseBody>>,
      options?: HandlerOptions,
    ) => {
      const { onCalled, ...rest } = {
        ...defaultRequestHandlerOptions,
        ...options,
      };
      const fullUrl = createFullUrl(url, path);
      return http.post<Params, RequestBodyType, ResponseBody>(
        fullUrl,
        async (info) => {
          const { request } = info;
          const { body } = matchers;

          if (!runMatchers(matchers, fullUrl, request, debugLog)) {
            return undefined;
          }

          // Body. Cloning important because multiple handlers may read body
          const actualBody = await extractBodyContent(request.clone());
          if (body !== undefined && !passesMatcherEqual(body, actualBody)) {
            debugLog(matchMessage("body", "POST", fullUrl, body, actualBody));
            return undefined;
          }

          await onCalled?.({
            get request() {
              return request.clone();
            },
          });
          return response(info);
        },
        rest,
      );
    },
    put: <
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
        info: ResponseResolverInfo<
          HttpRequestResolverExtras<Params>,
          RequestBodyType
        >,
        // Parameters<
        //   ResponseResolver<
        //     HttpRequestResolverExtras<Params>,
        //     RequestBodyType,
        //     ResponseBody
        //   >
        // >[0],
      ) =>
        | ResponseResolverReturnType<ResponseBody>
        | Promise<ResponseResolverReturnType<ResponseBody>>,
      options?: HandlerOptions,
    ) => {
      const { onCalled, ...rest } = {
        ...defaultRequestHandlerOptions,
        ...options,
      };
      const fullUrl = createFullUrl(url, path);
      return http.put<Params, RequestBodyType, ResponseBody>(
        fullUrl,
        async (info) => {
          const { request } = info;
          const { body } = matchers;

          if (!runMatchers(matchers, fullUrl, request, debugLog)) {
            return undefined;
          }

          // Body. Cloning important because multiple handlers may read body
          const actualBody = await extractBodyContent(request.clone());
          if (body !== undefined && !passesMatcherEqual(body, actualBody)) {
            debugLog(matchMessage("body", "PUT", fullUrl, body, actualBody));
            return undefined;
          }

          await onCalled?.({
            get request() {
              return request.clone();
            },
          });
          return response(info);
        },
        rest,
      );
    },
    patch: <
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
        info: ResponseResolverInfo<
          HttpRequestResolverExtras<Params>,
          RequestBodyType
        >,
        // Parameters<
        //   ResponseResolver<
        //     HttpRequestResolverExtras<Params>,
        //     RequestBodyType,
        //     ResponseBody
        //   >
        // >[0],
      ) =>
        | ResponseResolverReturnType<ResponseBody>
        | Promise<ResponseResolverReturnType<ResponseBody>>,
      options?: HandlerOptions,
    ) => {
      const { onCalled, ...rest } = {
        ...defaultRequestHandlerOptions,
        ...options,
      };
      const fullUrl = createFullUrl(url, path);
      return http.patch<Params, RequestBodyType, ResponseBody>(
        fullUrl,
        async (info) => {
          const { request } = info;
          const { body } = matchers;

          if (!runMatchers(matchers, fullUrl, request, debugLog)) {
            return undefined;
          }

          // Body. Cloning important because multiple handlers may read body
          const actualBody = await extractBodyContent(request.clone());
          if (body !== undefined && !passesMatcherEqual(body, actualBody)) {
            debugLog(matchMessage("body", "PATCH", fullUrl, body, actualBody));
            return undefined;
          }

          await onCalled?.({
            get request() {
              return request.clone();
            },
          });
          return response(info);
        },
        rest,
      );
    },
  };
}

export type { RestHandlersFactory };
export { createRestHandlersFactory };
