import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MockedRequest } from "msw";
import { createRestHandlersFactory } from "./rest";

describe("rest", () => {
  const builders = createRestHandlersFactory({
    url: "https://www.example.org",
  });

  describe("post", () => {
    it("allows matching of no matchers", async () => {
      const matcher = builders.post("/test", {}, (_1, res, ctx) =>
        res(
          ctx.json({
            ok: true,
          })
        )
      );
      const request = new MockedRequest(
        new URL("https://www.example.org/test"),
        {
          method: "POST",
        }
      );

      const result = await matcher.run(request);

      assert.equal(result?.response?.body, JSON.stringify({ ok: true }));
      assert.equal(result.response.status, 200);
    });

    it("correctly doesn't match when different base url", async () => {
      const matcher = builders.post("/test", {}, (_1, res, ctx) =>
        res(
          ctx.json({
            ok: true,
          })
        )
      );
      const request = new MockedRequest(new URL("https://www.other.org/test"), {
        method: "POST",
      });

      const result = await matcher.run(request);

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
        (_1, res, ctx) =>
          res(
            ctx.json({
              ok: true,
            })
          )
      );
      const request = new MockedRequest(
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
            })
          ).buffer,
        }
      );

      const result = await matcher.run(request);

      assert.equal(result?.response?.body, JSON.stringify({ ok: true }));
      assert.equal(result.response.status, 200);
    });
  });

  describe("get", () => {
    it("allows matching of no matchers", async () => {
      const matcher = builders.get("/test", {}, (_1, res, ctx) =>
        res(
          ctx.json({
            ok: true,
          })
        )
      );
      const request = new MockedRequest(
        new URL("https://www.example.org/test"),
        {
          method: "GET",
        }
      );

      const result = await matcher.run(request);

      assert.equal(result?.response?.body, JSON.stringify({ ok: true }));
      assert.equal(result.response.status, 200);
    });

    it("correctly doesn't match when different base url", async () => {
      const matcher = builders.get("/test", {}, (_1, res, ctx) =>
        res(
          ctx.json({
            ok: true,
          })
        )
      );
      const request = new MockedRequest(new URL("https://www.other.org/test"), {
        method: "GET",
      });

      const result = await matcher.run(request);

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
        (_1, res, ctx) =>
          res(
            ctx.json({
              ok: true,
            })
          )
      );
      const request = new MockedRequest(
        new URL("https://www.example.org/test?id=id-123"),
        {
          method: "GET",
          headers: {
            auth: "token-123",
            "Content-Type": "application/json",
          },
        }
      );

      const result = await matcher.run(request);

      assert.equal(result?.response?.body, JSON.stringify({ ok: true }));
      assert.equal(result.response.status, 200);
    });

    it("allows matching of headers case-insensitive", async () => {
      const matcher = builders.get(
        "/test",
        {
          headers: {
            AuTh: "token-123",
          },
        },
        (_1, res, ctx) =>
          res(
            ctx.json({
              ok: true,
            })
          )
      );
      const request = new MockedRequest(
        new URL("https://www.example.org/test?id=id-123"),
        {
          method: "GET",
          headers: {
            AUTH: "token-123",
            "Content-Type": "application/json",
          },
        }
      );

      const result = await matcher.run(request);

      assert.equal(result?.response?.body, JSON.stringify({ ok: true }));
      assert.equal(result.response.status, 200);
    });

    it("allows matching of headers when there's other junk", async () => {
      const matcher = builders.get(
        "/test",
        {
          headers: {
            auth: "token-123",
            accept: "*/*",
            "accept-encoding": "gzip,deflate",
            connection: "close",
            "content-length": "82",
            host: "techhk.aoscdn.com",
            "user-agent": "node-fetch/1.0",
          },
        },
        (_1, res, ctx) =>
          res(
            ctx.json({
              ok: true,
            })
          )
      );
      const request = new MockedRequest(
        new URL("https://www.example.org/test?id=id-123"),
        {
          method: "GET",
          headers: {
            AUTH: "token-123",
            "Content-Type": "application/json",
          },
        }
      );

      const result = await matcher.run(request);

      assert.equal(result?.response?.body, JSON.stringify({ ok: true }));
      assert.equal(result.response.status, 200);
    });
  });
});
