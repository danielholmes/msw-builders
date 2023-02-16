import { DocumentNode, Kind, OperationDefinitionNode } from "graphql";

const mutationNameMatcher = /mutation\s+([a-zA-Z0-9]+)/i;
const queryNameMatcher = /query\s+([a-zA-Z0-9]+)/i;

function getGraphQlName(
  type: "mutation" | "query",
  nameSource: string | DocumentNode
) {
  if (typeof nameSource === "object") {
    const nameDef = nameSource.definitions.find(
      (d): d is OperationDefinitionNode =>
        d.kind === Kind.OPERATION_DEFINITION && d.operation === type
    );
    if (!nameDef) {
      throw new Error(
        `Couldn't find ${type} in document ${JSON.stringify(nameSource)}`
      );
    }
    if (!nameDef.name) {
      throw new Error(
        `Document doesn't have name ${JSON.stringify(nameSource)}`
      );
    }

    return nameDef.name.value;
  }

  const match = nameSource.match(
    type === "mutation" ? mutationNameMatcher : queryNameMatcher
  );
  if (!match) {
    return nameSource;
  }
  return match[1];
}

export { getGraphQlName };
