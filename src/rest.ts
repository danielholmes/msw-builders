import {
  rest,
  DefaultBodyType,
  ResponseResolver,
  RestContext,
  RestRequest,
  PathParams,
} from "msw";
import { isEqual, partial, trimEnd, trimStart } from "lodash-es";
import { diff } from "jest-diff";
import { consoleDebugLog, nullLogger } from "./debug";

type NotFunction<T> = T extends Function ? never : T;

type Matcher<T> = NotFunction<T> | ((value: T) => boolean);

type MatcherOptions<
  TSearchParams extends Record<string, string>,
  THeaders extends Record<string, string>,
  RequestBodyType extends DefaultBodyType = DefaultBodyType
> = {
  readonly searchParams?: Matcher<TSearchParams>;
  readonly headers?: Matcher<THeaders>;
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
  expected: unknown,
  actual: unknown
) {
  const difference = diff(expected, actual);
  return `${method} ${url} ${type} differ\n${difference}`;
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

function passesMatcher<T>(matcher: Matcher<T> | undefined, value: unknown) {
  if (!matcher) {
    return true;
  }

  if (typeof matcher === "object" && !isEqual(matcher, value)) {
    return false;
  }

  if (typeof matcher === "function" && !(matcher as any)(value)) {
    return false;
  }

  return true;
}

function createRestHandlersFactory({ url, debug }: Options) {
  const debugLog = debug ? partial(consoleDebugLog, url) : nullLogger;
  return {
    post: <
      TSearchParams extends Record<string, string>,
      THeaders extends Record<string, string>,
      RequestBodyType extends DefaultBodyType = DefaultBodyType,
      Params extends PathParams<keyof Params> = PathParams<string>,
      ResponseBody extends DefaultBodyType = DefaultBodyType
    >(
      path: string,
      matchers: MatcherOptions<TSearchParams, THeaders, RequestBodyType>,
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
          const { searchParams, headers, body } = matchers;
          const { onCalled } = options ?? {};

          const checks = [
            {
              type: "headers",
              matcher: headers,
              actual: req.headers.all(),
            },
            {
              type: "body",
              matcher: body,
              // TODO: Get async content of body
              actual: typeof req.body === "object" && body ? body : {},
            },
            {
              type: "searchParams",
              matcher: searchParams,
              actual: searchParamsToObject(req.url.searchParams),
            },
          ];

          for (let i = 0; i < checks.length; i++) {
            const { actual, type, matcher } = checks[i];
            if (!passesMatcher(matcher as any, actual)) {
              debugLog(matchMessage(type, "POST", fullUrl, matcher, actual));
              return;
            }
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
