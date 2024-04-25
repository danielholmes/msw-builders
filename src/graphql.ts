// Waiting to find new API for graphql variables. Then can remove this.
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  graphql,
  GraphQLRequestHandler,
  GraphQLVariables,
  HttpResponse,
  RequestHandlerOptions,
} from "msw";
import { isEqual, partial } from "lodash-es";
import { diff } from "jest-diff";
import { consoleDebugLog, nullLogger } from "./debug.ts";

type HandlerOptions = RequestHandlerOptions & {
  readonly onCalled?: () => void;
};

type Options = {
  readonly url: string;
  readonly debug?: boolean;
  readonly defaultRequestHandlerOptions?: RequestHandlerOptions;
};

function matchMessage<Variables extends GraphQLVariables = GraphQLVariables>(
  type: string,
  name: string,
  expected: Variables,
  actual: Variables,
) {
  const difference = diff(expected, actual);
  return `${type} ${name} variables differ\n${difference ?? ""}`;
}

type ResultProvider<TQuery, TVariables> =
  | TQuery
  | ((variables: TVariables) => TQuery);

function createGraphQlHandlersFactory({
  url,
  debug,
  defaultRequestHandlerOptions,
}: Options) {
  const link = graphql.link(url);
  const debugLog = debug ? partial(consoleDebugLog, url) : nullLogger;
  return {
    mutation: <
      Query extends Record<string, unknown>,
      Variables extends GraphQLVariables = GraphQLVariables,
    >(
      operationName: Parameters<GraphQLRequestHandler>[0],
      expectedVariables: Variables,
      resultProvider: ResultProvider<Query, Variables>,
      options?: HandlerOptions,
    ) => {
      const { onCalled, ...rest } = {
        ...defaultRequestHandlerOptions,
        ...options,
      };
      return link.mutation<Query, Variables>(
        operationName,
        ({ variables }) => {
          // TODO: Update variables. Not sure how to operationName them in new msw version
          if (!isEqual(expectedVariables, variables)) {
            debugLog(
              matchMessage(
                "mutation",
                String(operationName),
                expectedVariables,
                variables,
              ),
            );
            return undefined;
          }
          onCalled?.();
          const data =
            typeof resultProvider === "function"
              ? resultProvider(variables)
              : resultProvider;
          return HttpResponse.json({ data });
        },
        rest,
      );
    },
    query: <
      Query extends Record<string, unknown>,
      Variables extends GraphQLVariables = GraphQLVariables,
    >(
      operationName: Parameters<GraphQLRequestHandler>[0],
      expectedVariables: Variables,
      resultProvider: ResultProvider<Query, Variables>,
      options?: HandlerOptions,
    ) => {
      const { onCalled, ...rest } = {
        ...defaultRequestHandlerOptions,
        ...options,
      };
      return link.query<Query, Variables>(
        operationName,
        ({ variables }) => {
          if (!isEqual(expectedVariables, variables)) {
            debugLog(
              matchMessage(
                "query",
                String(operationName),
                expectedVariables,
                variables,
              ),
            );
            return undefined;
          }
          onCalled?.();
          const data =
            typeof resultProvider === "function"
              ? resultProvider(variables)
              : resultProvider;
          return HttpResponse.json({ data });
        },
        rest,
      );
    },
  };
}

type GraphQlHandlersFactory = ReturnType<typeof createGraphQlHandlersFactory>;

export type { GraphQlHandlersFactory };
export { createGraphQlHandlersFactory };
