import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HttpResponse } from "msw";
import { createRestHandlersFactory } from "./http";
import { extractBodyContent } from "./utils";

describe("http", () => {
  const builders = createRestHandlersFactory({
    url: "https://www.example.org",
  });

  describe("post", () => {
    it("allows matching of no matchers", async () => {
      const matcher = builders.post("/test", {}, () =>
        HttpResponse.json({
          ok: true,
        }),
      );
      const request = new Request(new URL("https://www.example.org/test"), {
        method: "POST",
      });

      const result = await matcher.run({ request });

      const responseBody = result?.response?.body
        ? await extractBodyContent(result.response)
        : undefined;
      assert.deepEqual(responseBody, { ok: true });
      assert.equal(result?.response?.status, 200);
    });

    it("correctly doesn't match when different base url", async () => {
      const matcher = builders.post("/test", {}, () =>
        HttpResponse.json({
          ok: true,
        }),
      );
      const request = new Request(new URL("https://www.other.org/test"), {
        method: "POST",
      });

      const result = await matcher.run({ request });

      assert.equal(result, null);
    });

    it("allows matching of all matchers", async () => {
      const matcher = builders.post(
        "/test",
        {
          body: {
            input: "Daniel",
          },
          searchParams: {
            id: "id-123",
          },
          headers: {
            auth: "token-123",
          },
        },
        () =>
          HttpResponse.json({
            ok: true,
          }),
      );
      const request = new Request(
        new URL("https://www.example.org/test?id=id-123"),
        {
          method: "POST",
          headers: {
            auth: "token-123",
            "Content-Type": "application/json",
          },
          body: new TextEncoder().encode(
            JSON.stringify({
              input: "Daniel",
            }),
          ).buffer,
        },
      );

      const result = await matcher.run({ request });

      const responseBody = result?.response?.body
        ? await extractBodyContent(result.response)
        : undefined;
      assert.deepEqual(responseBody, { ok: true });
      assert.equal(result?.response?.status, 200);
    });
  });

  describe("get", () => {
    it("allows matching of no matchers", async () => {
      const matcher = builders.get("/test", {}, () =>
        HttpResponse.json({
          ok: true,
        }),
      );
      const request = new Request(new URL("https://www.example.org/test"), {
        method: "GET",
      });

      const result = await matcher.run({ request });

      const responseBody = result?.response?.body
        ? await extractBodyContent(result.response)
        : undefined;
      assert.deepEqual(responseBody, { ok: true });
      assert.equal(result?.response?.status, 200);
    });

    it("correctly doesn't match when different base url", async () => {
      const matcher = builders.get("/test", {}, () =>
        HttpResponse.json({
          ok: true,
        }),
      );
      const request = new Request(new URL("https://www.other.org/test"), {
        method: "GET",
      });

      const result = await matcher.run({ request });

      assert.equal(result, null);
    });

    it("allows matching of all matchers", async () => {
      const matcher = builders.get(
        "/test",
        {
          searchParams: {
            id: "id-123",
          },
          headers: {
            auth: "token-123",
          },
        },
        () =>
          HttpResponse.json({
            ok: true,
          }),
      );
      const request = new Request(
        new URL("https://www.example.org/test?id=id-123"),
        {
          method: "GET",
          headers: {
            auth: "token-123",
            "Content-Type": "application/json",
          },
        },
      );

      const result = await matcher.run({ request });

      const responseBody = result?.response?.body
        ? await extractBodyContent(result.response)
        : undefined;
      assert.deepEqual(responseBody, { ok: true });
      assert.equal(result?.response?.status, 200);
    });

    it("allows matching of headers case-insensitive", async () => {
      const matcher = builders.get(
        "/test",
        {
          headers: {
            AuTh: "token-123",
          },
        },
        () =>
          HttpResponse.json({
            ok: true,
          }),
      );
      const request = new Request(
        new URL("https://www.example.org/test?id=id-123"),
        {
          method: "GET",
          headers: {
            AUTH: "token-123",
            "Content-Type": "application/json",
          },
        },
      );

      const result = await matcher.run({ request });

      const responseBody = result?.response?.body
        ? await extractBodyContent(result.response)
        : undefined;
      assert.deepEqual(responseBody, { ok: true });
      assert.equal(result?.response?.status, 200);
    });

    it("allows matching of headers when there's other junk", async () => {
      const matcher = builders.get(
        "/test",
        {
          headers: {
            auth: "token-123",
          },
        },
        () =>
          HttpResponse.json({
            ok: true,
          }),
      );
      const request = new Request(
        new URL("https://www.example.org/test?id=id-123"),
        {
          method: "GET",
          headers: {
            AUTH: "token-123",
            "Content-Type": "application/json",
            accept: "*/*",
            "accept-encoding": "gzip,deflate",
            connection: "close",
            "content-length": "82",
            host: "techhk.aoscdn.com",
            "user-agent": "node-fetch/1.0",
          },
        },
      );

      const result = await matcher.run({ request });

      const responseBody = result?.response?.body
        ? await extractBodyContent(result.response)
        : undefined;
      assert.deepEqual(responseBody, { ok: true });
      assert.equal(result?.response?.status, 200);
    });
  });
});
