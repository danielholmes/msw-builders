import { graphql, GraphQLVariables } from "msw";
import { isEqual, partial } from "lodash-es";
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
  actual: Variables
) {
  const difference = diff(expected, actual);
  return `${type} ${name} variables differ\n${difference}`;
}

function createGraphQlHandlersFactory({ url, debug }: Options) {
  const link = graphql.link(url);
  const debugLog = debug ? partial(consoleDebugLog, url) : nullLogger;
  return {
    mutation: <
      Query extends Record<string, any>,
      Variables extends GraphQLVariables = GraphQLVariables
    >(
      nameOrMutation: string,
      expectedVariables: Variables,
      result: Query,
      options?: HandlerOptions
    ) => {
      const mutationName = getGraphQlName("mutation", nameOrMutation);
      return link.mutation<Query, Variables>(mutationName, (req, res, ctx) => {
        if (!isEqual(expectedVariables, req.variables)) {
          debugLog(
            matchMessage(
              "mutation",
              mutationName,
              expectedVariables,
              req.variables
            )
          );
          return undefined;
        }
        const { onCalled } = options ?? {};
        onCalled?.();
        return res(ctx.data(result));
      });
    },
    query: <
      Query extends Record<string, any>,
      Variables extends GraphQLVariables = GraphQLVariables
    >(
      nameOrQuery: string,
      expectedVariables: Variables,
      result: Query,
      options?: HandlerOptions
    ) => {
      const queryName = getGraphQlName("query", nameOrQuery);
      return link.query<Query, Variables>(queryName, (req, res, ctx) => {
        if (!isEqual(expectedVariables, req.variables)) {
          debugLog(
            matchMessage("query", queryName, expectedVariables, req.variables)
          );
          return undefined;
        }
        const { onCalled } = options ?? {};
        onCalled?.();
        return res(ctx.data(result));
      });
    },
  };
}

type GraphQlHandlersFactory = ReturnType<typeof createGraphQlHandlersFactory>;

export type { GraphQlHandlersFactory };
export { createGraphQlHandlersFactory };
