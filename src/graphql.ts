// Waiting to find new API for graphql variables. Then can remove this.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { graphql, GraphQLVariables, HttpResponse } from "msw";
import { isEqual, partial } from "lodash-es";
import { DocumentNode } from "graphql";
import { diff } from "jest-diff";
import { getGraphQlName } from "./get-name";
import { consoleDebugLog, nullLogger } from "./debug";

type HandlerOptions = {
  readonly onCalled?: () => void;
};

type Options = {
  readonly url: string;
  readonly debug?: boolean;
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

function createGraphQlHandlersFactory({ url, debug }: Options) {
  const link = graphql.link(url);
  const debugLog = debug ? partial(consoleDebugLog, url) : nullLogger;
  return {
    mutation: <
      Query extends Record<string, unknown>,
      Variables extends GraphQLVariables = GraphQLVariables,
    >(
      nameSource: string | DocumentNode,
      expectedVariables: Variables,
      resultProvider: ResultProvider<Query, Variables>,
      options?: HandlerOptions,
    ) => {
      const mutationName = getGraphQlName("mutation", nameSource);
      return link.mutation<Query, Variables>(mutationName, ({ request }) => {
        // TODO: Update variables. Not sure how to use them in new msw version
        if (!isEqual(expectedVariables, (request as any).variables)) {
          debugLog(
            matchMessage(
              "mutation",
              mutationName,
              expectedVariables,
              (request as any).variables,
            ),
          );
          return undefined;
        }
        const { onCalled } = options ?? {};
        onCalled?.();
        const data =
          typeof resultProvider === "function"
            ? resultProvider((request as unknown as any).variables)
            : resultProvider;
        return HttpResponse.json({ data });
      });
    },
    query: <
      Query extends Record<string, unknown>,
      Variables extends GraphQLVariables = GraphQLVariables,
    >(
      nameSource: string | DocumentNode,
      expectedVariables: Variables,
      resultProvider: ResultProvider<Query, Variables>,
      options?: HandlerOptions,
    ) => {
      const queryName = getGraphQlName("query", nameSource);
      return link.query<Query, Variables>(queryName, ({ request }) => {
        // TODO: Update variables. Not sure how to use them in new msw version
        if (!isEqual(expectedVariables, (request as any).variables)) {
          debugLog(
            matchMessage(
              "query",
              queryName,
              expectedVariables,
              (request as any).variables,
            ),
          );
          return undefined;
        }
        const { onCalled } = options ?? {};
        onCalled?.();
        const data =
          typeof resultProvider === "function"
            ? resultProvider((request as any).variables)
            : resultProvider;
        return HttpResponse.json({ data });
      });
    },
  };
}

type GraphQlHandlersFactory = ReturnType<typeof createGraphQlHandlersFactory>;

export type { GraphQlHandlersFactory };
export { createGraphQlHandlersFactory };
