// Waiting to find new API for graphql variables. Then can remove this.
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  graphql,
  GraphQLHandler,
  HttpResponse,
  type DefaultBodyType,
  type GraphQLRequestHandler,
  type GraphQLVariables,
  type RequestHandlerOptions,
} from "msw";
import { diff } from "jest-diff";
import { GraphQLError } from "graphql";
import { consoleDebugLog, nullLogger } from "./debug.ts";
import { isEqual, partial } from "./utils.ts";

type BuilderHandlerOptions = {
  readonly onCalled?: () => void;
};

type HandlerOptions = RequestHandlerOptions & BuilderHandlerOptions;

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

// Copied from msw - can't find how to import it
type GraphQLResponseBody<BodyType extends DefaultBodyType> =
  | {
      data?: BodyType | null;
      errors?: readonly Partial<GraphQLError>[] | null;
    }
  | null
  | undefined;

type ResultProvider<TQuery extends DefaultBodyType, TVariables> =
  | GraphQLResponseBody<TQuery>
  | ((variables: TVariables) => GraphQLResponseBody<TQuery>);

type GraphQlHandlersFactory = {
  mutation: <
    Query extends Record<string, unknown>,
    Variables extends GraphQLVariables = GraphQLVariables,
  >(
    operationName: Parameters<GraphQLRequestHandler>[0],
    expectedVariables: Variables,
    resultProvider: ResultProvider<Query, Variables>,
    options?: HandlerOptions,
  ) => GraphQLHandler;
  operation: <
    Query extends Record<string, unknown>,
    Variables extends GraphQLVariables = GraphQLVariables,
  >(
    expectedVariables: Variables,
    resultProvider: ResultProvider<Query, Variables>,
    options?: HandlerOptions,
  ) => GraphQLHandler;
  query: <
    Query extends Record<string, unknown>,
    Variables extends GraphQLVariables = GraphQLVariables,
  >(
    operationName: Parameters<GraphQLRequestHandler>[0],
    expectedVariables: Variables,
    resultProvider: ResultProvider<Query, Variables>,
    options?: HandlerOptions,
  ) => GraphQLHandler;
};

function createGraphQlHandlersFactory({
  url,
  debug,
  defaultRequestHandlerOptions,
}: Options): GraphQlHandlersFactory {
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
                // eslint-disable-next-line @typescript-eslint/no-base-to-string
                String(operationName),
                expectedVariables,
                variables,
              ),
            );
            return undefined;
          }
          onCalled?.();
          const responseBody =
            typeof resultProvider === "function"
              ? resultProvider(variables)
              : resultProvider;
          return HttpResponse.json(responseBody);
        },
        rest,
      );
    },
    operation: <
      Query extends Record<string, unknown>,
      Variables extends GraphQLVariables = GraphQLVariables,
    >(
      expectedVariables: Variables,
      resultProvider: ResultProvider<Query, Variables>,
      options?: BuilderHandlerOptions,
    ) => {
      const { onCalled } = options ?? {};
      return link.operation<Query, Variables>(({ variables }) => {
        if (!isEqual(expectedVariables, variables)) {
          debugLog(
            matchMessage(
              "operation",
              "(anonymous)",
              expectedVariables,
              variables,
            ),
          );
          return undefined;
        }
        onCalled?.();
        const responseBody =
          typeof resultProvider === "function"
            ? resultProvider(variables)
            : resultProvider;
        return HttpResponse.json(responseBody);
      });
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
                // eslint-disable-next-line @typescript-eslint/no-base-to-string
                String(operationName),
                expectedVariables,
                variables,
              ),
            );
            return undefined;
          }
          onCalled?.();
          const responseBody =
            typeof resultProvider === "function"
              ? resultProvider(variables)
              : resultProvider;
          return HttpResponse.json(responseBody);
        },
        rest,
      );
    },
  };
}

export type { GraphQlHandlersFactory };
export { createGraphQlHandlersFactory };
