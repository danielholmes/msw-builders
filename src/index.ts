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
    Query_1 extends Record<string, any>,
    Variables_1 extends GraphQLVariables = GraphQLVariables
  >(
    nameOrMutation: string,
    expectedVariables: Variables_1,
    result: Query_1,
    options?: HandlerOptions
  ) => ReturnType<typeof graphql.mutation>;
  readonly query: <
    Query_1 extends Record<string, any>,
    Variables_1 extends GraphQLVariables = GraphQLVariables
  >(
    nameOrQuery: string,
    expectedVariables: Variables_1,
    result: Query_1,
    options?: HandlerOptions
  ) => ReturnType<typeof graphql.query>;
};

type Options = {
  readonly url: string;
  readonly debug?: boolean;
};

function createGraphQlHandlersFactory({
  url,
  debug,
}: Options): GraphQlHandlersFactory {
  const link = graphql.link(url);
  const debugLog = debug ? partial(consoleDebugLog, url) : nullLogger;
  return {
    mutation: <
      Query_1 extends Record<string, any>,
      Variables_1 extends GraphQLVariables = GraphQLVariables
    >(
      nameOrMutation: string,
      expectedVariables: Variables_1,
      result: Query_1,
      options?: HandlerOptions
    ) => {
      const mutationName = getGraphQlName("mutation", nameOrMutation);
      return link.mutation<Query_1, Variables_1>(
        mutationName,
        (req, res, ctx) => {
          if (!isEqual(expectedVariables, req.variables)) {
            const diff = objectDiff(expectedVariables, req.variables);
            debugLog(
              `mutation ${mutationName} variables diff: ${JSON.stringify(diff)}`
            );
            return undefined;
          }
          const onCalled = options?.onCalled;
          if (onCalled) {
            onCalled();
          }
          return res(ctx.data(result));
        }
      );
    },
    query: <
      Query_1 extends Record<string, any>,
      Variables_1 extends GraphQLVariables = GraphQLVariables
    >(
      nameOrQuery: string,
      expectedVariables: Variables_1,
      result: Query_1,
      options?: HandlerOptions
    ) => {
      const queryName = getGraphQlName("query", nameOrQuery);
      return link.query<Query_1, Variables_1>(queryName, (req, res, ctx) => {
        if (!isEqual(expectedVariables, req.variables)) {
          const diff = objectDiff(expectedVariables, req.variables);
          debugLog(
            `query ${queryName} variables diff: ${JSON.stringify(diff)}`
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
