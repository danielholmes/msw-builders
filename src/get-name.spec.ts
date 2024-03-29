import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gql } from "graphql-tag";
import { getGraphQlName } from "./get-name";

describe("getGraphQlName", () => {
  it("returns simple name", () => {
    const result = getGraphQlName("query", "viewerQuery");

    assert.equal(result, "viewerQuery");
  });

  it("returns name from no args document", () => {
    const result = getGraphQlName(
      "query",
      `query viewerQuery {
            viewer {
                name
            }
        }`,
    );

    assert.equal(result, "viewerQuery");
  });

  it("returns name from args document", () => {
    const result = getGraphQlName(
      "query",
      `query viewerQuery($id: ID!) {
            viewer(id: $id) {
                name
            }
        }`,
    );

    assert.equal(result, "viewerQuery");
  });

  it("returns name from args document with leading white space", () => {
    const result = getGraphQlName(
      "query",
      `
        query viewerQuery($id: ID!) {
            viewer(id: $id) {
                name
            }
        }
        `,
    );

    assert.equal(result, "viewerQuery");
  });

  it("returns name from args document node", () => {
    const result = getGraphQlName(
      "query",
      gql`
        query viewerQuery($id: ID!) {
          viewer(id: $id) {
            name
          }
        }
      `,
    );

    assert.equal(result, "viewerQuery");
  });
});
