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

type MatcherOptions<
  TSearchParams extends Record<string, string>,
  THeaders extends Record<string, string>,
  RequestBodyType extends DefaultBodyType = DefaultBodyType
> = {
  readonly searchParams?: TSearchParams;
  readonly headers?: THeaders;
  readonly body?: RequestBodyType;
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
  return trimEnd(baseUrl, "/") + "/" + trimStart(path, "/");
}

function searchParamsToObject(searchParams: URLSearchParams) {
  const obj: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
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

          if (headers) {
            const actualHeaders = req.headers.all();
            if (!isEqual(headers, actualHeaders)) {
              debugLog(
                matchMessage("headers", "POST", fullUrl, headers, actualHeaders)
              );
              return;
            }
          }

          if (body) {
            // TODO: Get async content of body
            const actualBody = typeof req.body === "object" && body ? body : {};
            if (!isEqual(body, actualBody)) {
              debugLog(matchMessage("body", "POST", fullUrl, body, actualBody));
              return;
            }
          }

          if (searchParams) {
            const actualSearchParams = searchParamsToObject(
              req.url.searchParams
            );
            if (!isEqual(searchParams, actualSearchParams)) {
              debugLog(
                matchMessage(
                  "searchParams",
                  "POST",
                  fullUrl,
                  searchParams,
                  actualSearchParams
                )
              );
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
