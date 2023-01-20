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

type MatcherOptions<TSearchParams extends Record<string, string>> = {
  readonly searchParams?: TSearchParams;
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
  expected: Record<string, string>,
  actual: Record<string, string>
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
      RequestBodyType extends DefaultBodyType = DefaultBodyType,
      Params extends PathParams<keyof Params> = PathParams<string>,
      ResponseBody extends DefaultBodyType = DefaultBodyType
    >(
      path: string,
      matchers: MatcherOptions<TSearchParams>,
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
          const { searchParams } = matchers;
          const { onCalled } = options ?? {};

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
