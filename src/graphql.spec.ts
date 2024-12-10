import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { DefaultBodyType, StrictRequest } from "msw";
import { createGraphQlHandlersFactory } from "./graphql.ts";
import { parse } from "graphql";

describe("graphql", () => {
  const builders = createGraphQlHandlersFactory({
    url: "https://www.example.org/graphql",
  });

  describe("query", () => {
    it("allows matching by name", async () => {
      const dummyResponse = {
        data: {
          viewer: {
            name: "Hello",
          },
        },
      };
      const matcher = builders.query<{ viewer: { name: string } }>(
        "hello",
        {},
        dummyResponse,
      );
      const request = new Request(new URL("https://www.example.org/graphql"), {
        method: "POST",
        body: JSON.stringify({
          query: `query hello { viewer { name } }`,
          variables: {},
        }),
      }) as StrictRequest<DefaultBodyType>;

      const result = await matcher.run({ requestId: "1", request });

      const response = result?.response;
      const responseBody = await response?.json();
      assert.deepEqual(responseBody, dummyResponse);
      assert.equal(response?.status, 200);
    });

    it("allows matching by query", async () => {
      const query = `query hello { viewer { name } }`;
      const dummyResponse = {
        data: {
          viewer: {
            name: "Hello",
          },
        },
      };
      const matcher = builders.query<{ viewer: { name: string } }>(
        parse(query),
        {},
        dummyResponse,
      );
      const request = new Request(new URL("https://www.example.org/graphql"), {
        method: "POST",
        body: JSON.stringify({
          query,
          variables: {},
        }),
      }) as StrictRequest<DefaultBodyType>;

      const result = await matcher.run({ requestId: "1", request });

      const response = result?.response;
      const responseBody = await response?.json();
      assert.deepEqual(responseBody, dummyResponse);
      assert.equal(response?.status, 200);
    });

    it("allows matching with variables", async () => {
      const query = `query hello($id: ID!) { user(id: $id) { name } }`;
      const dummyResponse = {
        data: {
          user: {
            name: "Hello",
          },
        },
      };
      const matcher = builders.query<{ user: { name: string } }>(
        parse(query),
        {
          id: "user-123",
        },
        dummyResponse,
      );
      const request = new Request(new URL("https://www.example.org/graphql"), {
        method: "POST",
        body: JSON.stringify({
          query,
          variables: { id: "user-123" },
        }),
      }) as StrictRequest<DefaultBodyType>;

      const result = await matcher.run({ requestId: "1", request });

      const response = result?.response;
      const responseBody = await response?.json();
      assert.deepEqual(responseBody, dummyResponse);
      assert.equal(response?.status, 200);
    });

    it("allows non-matching with variables", async () => {
      const query = `query hello($id: ID!) { user(id: $id) { name } }`;
      const dummyResponse = {
        data: {
          user: {
            name: "Hello",
          },
        },
      };
      const matcher = builders.query<{ user: { name: string } }>(
        parse(query),
        {
          id: "user-xyz",
        },
        dummyResponse,
      );
      const request = new Request(new URL("https://www.example.org/graphql"), {
        method: "POST",
        body: JSON.stringify({
          query,
          variables: { id: "user-123" },
        }),
      }) as StrictRequest<DefaultBodyType>;

      const result = await matcher.run({ requestId: "1", request });

      assert.equal(result?.response, undefined);
    });

    it("allows matching with headers", async () => {
      const dummyResponse = {
        data: {
          viewer: {
            name: "Hello",
          },
        },
      };
      const matcher = builders.query<{ viewer: { name: string } }>(
        "hello",
        {},
        dummyResponse,
        {
          headers: {
            Authorization: "auth-token-123",
          },
        },
      );
      const request = new Request(new URL("https://www.example.org/graphql"), {
        method: "POST",
        headers: {
          authorization: "auth-token-123",
        },
        body: JSON.stringify({
          query: `query hello { viewer { name } }`,
          variables: {},
        }),
      }) as StrictRequest<DefaultBodyType>;

      const result = await matcher.run({ requestId: "1", request });

      const response = result?.response;
      const responseBody = await response?.json();
      assert.deepEqual(responseBody, dummyResponse);
      assert.equal(response?.status, 200);
    });

    it("allows non-matching with headers", async () => {
      const dummyResponse = {
        data: {
          viewer: {
            name: "Hello",
          },
        },
      };
      const matcher = builders.query<{ viewer: { name: string } }>(
        "hello",
        {},
        dummyResponse,
        {
          headers: {
            Authorization: "auth-token-123",
          },
        },
      );
      const request = new Request(new URL("https://www.example.org/graphql"), {
        method: "POST",
        headers: {
          authorization: "auth-token-xyz",
        },
        body: JSON.stringify({
          query: `query hello { viewer { name } }`,
          variables: {},
        }),
      }) as StrictRequest<DefaultBodyType>;

      const result = await matcher.run({ requestId: "1", request });

      assert.equal(result?.response, undefined);
    });
  });
});
