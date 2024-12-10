import { describe, it, before, afterEach, after } from "node:test";
import assert from "node:assert/strict";
import { setupServer } from "msw/node";
import type { DefaultBodyType, StrictRequest } from "msw";
import { HttpResponse } from "msw";
import { createRestHandlersFactory } from "./http.ts";
import { extractBodyContent } from "./utils.ts";

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
      }) as StrictRequest<DefaultBodyType>;

      const result = await matcher.run({ requestId: "1", request });

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

      const result = await matcher.run({ requestId: "1", request });

      assert.equal(result, null);
    });

    it("allows matching of all matchers with json body", async () => {
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

      const result = await matcher.run({ requestId: "1", request });

      const responseBody = result?.response?.body
        ? await extractBodyContent(result.response)
        : undefined;
      assert.deepEqual(responseBody, { ok: true });
      assert.equal(result?.response?.status, 200);
    });

    it("allows matching of all matchers with form data body", async () => {
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
      const formData = new FormData();
      formData.set("input", "Daniel");
      const request = new Request(
        new URL("https://www.example.org/test?id=id-123"),
        {
          method: "POST",
          headers: {
            auth: "token-123",
            // Setting form data as body automatically sets header
            // "Content-Type": "multipart/form-data",
          },
          body: formData,
        },
      );

      const result = await matcher.run({ requestId: "1", request });

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

      const result = await matcher.run({ requestId: "1", request });

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

      const result = await matcher.run({ requestId: "1", request });

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

      const result = await matcher.run({ requestId: "1", request });

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

      const result = await matcher.run({ requestId: "1", request });

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

      const result = await matcher.run({ requestId: "1", request });

      const responseBody = result?.response?.body
        ? await extractBodyContent(result.response)
        : undefined;
      assert.deepEqual(responseBody, { ok: true });
      assert.equal(result?.response?.status, 200);
    });
  });

  describe("post-integration", () => {
    const server = setupServer();

    before(() => server.listen());
    afterEach(() => server.resetHandlers());
    after(() => server.close());

    it("works correctly", async () => {
      const serviceBuilder = createRestHandlersFactory({
        url: "http://localhost:7357",
      });
      let handlerCalled = false;
      server.use(
        serviceBuilder.post(
          "/test",
          { body: { hello: "other" } },
          () => HttpResponse.json({ ok: true }),
          {
            onCalled() {
              handlerCalled = true;
            },
          },
        ),
      );

      const response = await fetch(
        new Request("http://localhost:7357/test", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hello: "other" }),
        }),
      );

      assert.equal(handlerCalled, true);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: true });
    });

    it("works correctly with second handler match", async () => {
      const serviceBuilder = createRestHandlersFactory({
        url: "http://localhost:7357",
      });
      let firstHandlerCalled = false;
      let secondHandlerCalled = false;
      server.use(
        serviceBuilder.post(
          "/test",
          { body: { foo: "bar" } },
          () => HttpResponse.json({ ok: true }),
          {
            onCalled() {
              firstHandlerCalled = true;
            },
          },
        ),
        serviceBuilder.post(
          "/test",
          { body: { hello: "other" } },
          () => HttpResponse.json({ ok: "2" }),
          {
            onCalled() {
              secondHandlerCalled = true;
            },
          },
        ),
      );

      const response = await fetch(
        new Request("http://localhost:7357/test", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hello: "other" }),
        }),
      );

      assert.equal(firstHandlerCalled, false);
      assert.equal(secondHandlerCalled, true);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: "2" });
    });
  });

  describe("options", () => {
    it("allows matching of no matchers", async () => {
      const matcher = builders.options("/test", {}, () =>
        HttpResponse.json({
          ok: true,
        }),
      );
      const request = new Request(new URL("https://www.example.org/test"), {
        method: "OPTIONS",
      });

      const result = await matcher.run({ requestId: "1", request });

      const responseBody = result?.response?.body
        ? await extractBodyContent(result.response)
        : undefined;
      assert.deepEqual(responseBody, { ok: true });
      assert.equal(result?.response?.status, 200);
    });
  });
});
