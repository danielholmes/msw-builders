const mutationNameMatcher = /mutation\s+([a-zA-Z0-9]+)/i;
const queryNameMatcher = /query\s+([a-zA-Z0-9]+)/i;

function getGraphQlName(type: "mutation" | "query", nameOr: string) {
  const match = nameOr.match(
    type === "mutation" ? mutationNameMatcher : queryNameMatcher
  );
  if (!match) {
    return nameOr;
  }
  return match[1];
}

export { getGraphQlName };
