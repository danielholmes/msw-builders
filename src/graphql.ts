// Waiting to find new API for graphql variables. Then can remove this.
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  graphql,
  HttpResponse,
  type DefaultBodyType,
  type GraphQLRequestHandler,
  type GraphQLVariables,
  type RequestHandlerOptions,
  type GraphQLHandler,
  type GraphQLQuery,
  type GraphQLResponseResolver,
} from "msw";
import { diff } from "jest-diff";
import type { GraphQLError } from "graphql";
import { consoleDebugLog, nullLogger } from "./debug.ts";
import { isEqual, partial } from "./utils.ts";
import type { Matcher } from "./shared-matchers.ts";
import { matchHeaders } from "./shared-matchers.ts";

type BuilderHandlerOptions<THeaders extends Record<string, string>> = {
  readonly onCalled?: () => void;
  readonly headers?: Matcher<THeaders>;
};

type HandlerOptions<THeaders extends Record<string, string>> =
  RequestHandlerOptions & BuilderHandlerOptions<THeaders>;

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

function operationNameToString(name: Parameters<GraphQLRequestHandler>[0]) {
  if (typeof name === "string") {
    return name;
  }

  if (name instanceof RegExp) {
    return name.source;
  }

  const definitionNames = name.definitions
    .map((d) => ("name" in d ? d.name?.value : undefined))
    .filter((n): n is string => !!n);

  if (definitionNames.length === 0) {
    return "<unnamed operation>";
  }

  return definitionNames[0];
}

type MatchOptions<
  TVariables extends GraphQLVariables = GraphQLVariables,
  THeaders extends Record<string, string> = Record<string, string>,
> = {
  readonly headersMatcher?: Matcher<THeaders>;
  readonly expectedVariables: TVariables;
};

function runMatchAndDebugLog<
  TVariables extends GraphQLVariables = GraphQLVariables,
  THeaders extends Record<string, string> = Record<string, string>,
>(
  operationType: "mutation" | "query" | "operation",
  operationName: Parameters<GraphQLRequestHandler>[0],
  { headersMatcher, expectedVariables }: MatchOptions<TVariables, THeaders>,
  {
    request,
    variables,
  }: Parameters<GraphQLResponseResolver<GraphQLQuery, TVariables>>[0],
  debugLog: typeof console.log,
) {
  if (headersMatcher !== undefined && !matchHeaders(headersMatcher, request)) {
    debugLog(
      matchMessage(
        operationType,
        operationNameToString(operationName),
        expectedVariables,
        variables,
      ),
    );
    return false;
  }

  if (!isEqual(expectedVariables, variables)) {
    debugLog(
      matchMessage(
        operationType,
        operationNameToString(operationName),
        expectedVariables,
        variables,
      ),
    );
    return false;
  }

  return true;
}

// JSR requires explicit type for exported types
type GraphQlHandlersFactory = {
  mutation: <
    Query extends Record<string, unknown>,
    Variables extends GraphQLVariables = GraphQLVariables,
    THeaders extends Record<string, string> = Record<string, string>,
  >(
    operationName: Parameters<GraphQLRequestHandler>[0],
    expectedVariables: Variables,
    resultProvider: ResultProvider<Query, Variables>,
    options?: HandlerOptions<THeaders>,
  ) => GraphQLHandler;
  operation: <
    Query extends Record<string, unknown>,
    Variables extends GraphQLVariables = GraphQLVariables,
    THeaders extends Record<string, string> = Record<string, string>,
  >(
    expectedVariables: Variables,
    resultProvider: ResultProvider<Query, Variables>,
    options?: HandlerOptions<THeaders>,
  ) => GraphQLHandler;
  query: <
    Query extends Record<string, unknown>,
    Variables extends GraphQLVariables = GraphQLVariables,
    THeaders extends Record<string, string> = Record<string, string>,
  >(
    operationName: Parameters<GraphQLRequestHandler>[0],
    expectedVariables: Variables,
    resultProvider: ResultProvider<Query, Variables>,
    options?: HandlerOptions<THeaders>,
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
      THeaders extends Record<string, string> = Record<string, string>,
    >(
      operationName: Parameters<GraphQLRequestHandler>[0],
      expectedVariables: Variables,
      resultProvider: ResultProvider<Query, Variables>,
      options?: HandlerOptions<THeaders>,
    ) => {
      const { onCalled, headers, ...rest } = {
        ...defaultRequestHandlerOptions,
        ...options,
      };
      return link.mutation<Query, Variables>(
        operationName,
        (info) => {
          if (
            !runMatchAndDebugLog(
              "mutation",
              operationName,
              { headersMatcher: headers, expectedVariables },
              info,
              debugLog,
            )
          ) {
            return undefined;
          }

          const { variables } = info;
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
      THeaders extends Record<string, string> = Record<string, string>,
    >(
      expectedVariables: Variables,
      resultProvider: ResultProvider<Query, Variables>,
      options?: BuilderHandlerOptions<THeaders>,
    ) => {
      const { onCalled, headers } = options ?? {};
      return link.operation<Query, Variables>((info) => {
        if (
          !runMatchAndDebugLog(
            "operation",
            "(anonymous)",
            { headersMatcher: headers, expectedVariables },
            info,
            debugLog,
          )
        ) {
          return undefined;
        }

        const { variables } = info;
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
      THeaders extends Record<string, string> = Record<string, string>,
    >(
      operationName: Parameters<GraphQLRequestHandler>[0],
      expectedVariables: Variables,
      resultProvider: ResultProvider<Query, Variables>,
      options?: HandlerOptions<THeaders>,
    ) => {
      const { onCalled, headers, ...rest } = {
        ...defaultRequestHandlerOptions,
        ...options,
      };
      return link.query<Query, Variables>(
        operationName,
        (info) => {
          if (
            !runMatchAndDebugLog(
              "query",
              operationName,
              { headersMatcher: headers, expectedVariables },
              info,
              debugLog,
            )
          ) {
            return undefined;
          }

          const { variables } = info;
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
