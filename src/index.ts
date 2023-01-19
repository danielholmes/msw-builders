import { graphql, GraphQLVariables } from "msw";
import { isEqual } from "lodash-es";
import { getGraphQlName } from "./get-name";

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
};

function createGraphQlHandlersFactory({
  url,
}: Options): GraphQlHandlersFactory {
  const link = graphql.link(url);
  return {
    mutation: <
      Query_1 extends Record<string, any>,
      Variables_1 extends GraphQLVariables = GraphQLVariables
    >(
      nameOrMutation: string,
      expectedVariables: Variables_1,
      result: Query_1,
      options?: HandlerOptions
    ) =>
      link.mutation<Query_1, Variables_1>(
        getGraphQlName("mutation", nameOrMutation),
        (req, res, ctx) => {
          if (!isEqual(expectedVariables, req.variables)) {
            return undefined;
          }
          const onCalled = options?.onCalled;
          if (onCalled) {
            onCalled();
          }
          return res(ctx.data(result));
        }
      ),
    query: <
      Query_1 extends Record<string, any>,
      Variables_1 extends GraphQLVariables = GraphQLVariables
    >(
      nameOrQuery: string,
      expectedVariables: Variables_1,
      result: Query_1,
      options?: HandlerOptions
    ) =>
      link.query<Query_1, Variables_1>(
        getGraphQlName("query", nameOrQuery),
        (req, res, ctx) => {
          if (!isEqual(expectedVariables, req.variables)) {
            return undefined;
          }
          const onCalled = options?.onCalled;
          if (onCalled) {
            onCalled();
          }
          return res(ctx.data(result));
        }
      ),
  };
}

export type { GraphQlHandlersFactory };
export { createGraphQlHandlersFactory };
