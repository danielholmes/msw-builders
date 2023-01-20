import { graphql, GraphQLVariables } from "msw";
import { isEqual, partial } from "lodash-es";
import { getGraphQlName } from "./get-name";
import { consoleDebugLog, nullLogger } from "./debug";
import { objectDiff } from "./utils";

type HandlerOptions = {
  readonly onCalled?: () => void;
};

type GraphQlHandlersFactory = {
  readonly mutation: <
    Query extends Record<string, any>,
    Variables extends GraphQLVariables = GraphQLVariables
  >(
    nameOrMutation: string,
    expectedVariables: Variables,
    result: Query,
    options?: HandlerOptions
  ) => ReturnType<typeof graphql.mutation>;
  readonly query: <
    Query extends Record<string, any>,
    Variables extends GraphQLVariables = GraphQLVariables
  >(
    nameOrQuery: string,
    expectedVariables: Variables,
    result: Query,
    options?: HandlerOptions
  ) => ReturnType<typeof graphql.query>;
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
  const diff = objectDiff(expected, actual);
  return `${type} ${name} variables diff: ${JSON.stringify(
    diff
  )}, expected: ${JSON.stringify(expected)}, actual: ${actual}`;
}

function createGraphQlHandlersFactory({
  url,
  debug,
}: Options): GraphQlHandlersFactory {
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
        const onCalled = options?.onCalled;
        if (onCalled) {
          onCalled();
        }
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
        const onCalled = options?.onCalled;
        if (onCalled) {
          onCalled();
        }
        return res(ctx.data(result));
      });
    },
  };
}

export type { GraphQlHandlersFactory };
export { createGraphQlHandlersFactory };
