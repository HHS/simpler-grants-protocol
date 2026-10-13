import { afterAll, afterEach, beforeAll, describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  Auth,
  BatchParseError,
  Client,
  parseBatch,
  type AwardGetOptions,
  type AwardListOptions,
} from "../../src/client";
import { definePlugin } from "../../src/extensions";
import { AwardBaseSchema } from "../../src/schemas";
import type { Award } from "../../src/types";
import { createPaginatedHandler, http, HttpResponse, setupServer } from "../utils/mock-fetch";

const PLAIN_ID = "award/2026?revision=1#final";
const PLUGIN_ID = "partner award/%complete";
const NOT_FOUND_ID = "missing/award?revision=2";
const MALFORMED_ID = "malformed/award#response";
const MALFORMED_ENVELOPE_ID = "malformed/envelope";
const INVALID_JSON_ID = "invalid/json";

const award = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  title: "Community Health Center Grant",
  description: "Supports community health center improvements.",
  status: { value: "awarded" },
  createdAt: "2026-03-01T00:00:00Z",
  lastModifiedAt: "2026-06-01T00:00:00Z",
};

const requests: Array<{ path: string; method: string; authorization: string | null }> = [];

const server = setupServer(
  http.get("/common-grants/awards/:id", ({ params, request, method }) => {
    requests.push({
      path: new URL(request.url).pathname,
      method,
      authorization: request.headers.get("authorization"),
    });

    if (params.id === encodeURIComponent(NOT_FOUND_ID)) {
      return HttpResponse.json({ error: "Award not found" }, { status: 404 });
    }
    if (params.id === encodeURIComponent(MALFORMED_ID)) {
      return HttpResponse.json({ status: 200, message: "Success", data: { id: award.id } });
    }
    if (params.id === encodeURIComponent(MALFORMED_ENVELOPE_ID)) {
      return HttpResponse.json({ status: 200, message: "Success" });
    }
    if (params.id === encodeURIComponent(INVALID_JSON_ID)) {
      return HttpResponse.text("{not-json");
    }
    return HttpResponse.json({ status: 200, message: "Success", data: award });
  })
);

describe("Awards", () => {
  beforeAll(() => server.listen());
  afterEach(() => {
    requests.length = 0;
    server.resetHandlers();
  });
  afterAll(() => server.close());

  it("gets parsed awards through plain and plugin-built clients and rejects invalid responses", async () => {
    const client = new Client({
      baseUrl: "https://api.example.org",
      auth: Auth.bearer("plain-token"),
    });
    const pluginClient = definePlugin({}).getClient({
      baseUrl: "https://api.example.org",
      auth: Auth.bearer("plugin-token"),
    });

    const plainAward: Award = await client.awards.get(PLAIN_ID);
    const pluginAward: Award = await pluginClient.awards.get(PLUGIN_ID);

    expectTypeOf(plainAward).toMatchTypeOf<Award>();
    expectTypeOf(pluginAward).toMatchTypeOf<Award>();
    expect(plainAward).toMatchObject({ id: award.id, title: award.title });
    expect(plainAward.createdAt).toBeInstanceOf(Date);
    expect(pluginAward.lastModifiedAt).toBeInstanceOf(Date);
    expect(requests).toEqual([
      {
        path: `/common-grants/awards/${encodeURIComponent(PLAIN_ID)}`,
        method: "GET",
        authorization: "Bearer plain-token",
      },
      {
        path: `/common-grants/awards/${encodeURIComponent(PLUGIN_ID)}`,
        method: "GET",
        authorization: "Bearer plugin-token",
      },
    ]);

    await expect(client.awards.get(NOT_FOUND_ID)).rejects.toThrow("404");
    await expect(client.awards.get(MALFORMED_ID)).rejects.toThrow();
    await expect(client.awards.get(MALFORMED_ENVELOPE_ID)).rejects.toThrow();
    await expect(client.awards.get(INVALID_JSON_ID)).rejects.toThrow();
  });

  it("auto-paginates with client limits while explicit pages preserve their envelope", async () => {
    const awards = Array.from({ length: 5 }, (_, index) => ({
      ...award,
      id: `123e4567-e89b-42d3-a456-${String(index + 1).padStart(12, "0")}`,
      title: `Award ${index + 1}`,
    }));
    const requestedPages: string[] = [];
    const paginatedHandler = createPaginatedHandler({ items: awards, defaultPageSize: 99 });

    server.use(
      http.get("/common-grants/awards", info => {
        requestedPages.push(new URL(info.url).search);
        return paginatedHandler(info);
      })
    );

    const limitedClient = new Client({
      baseUrl: "https://api.example.org",
      pageSize: 2,
      maxItems: 3,
    });
    const aggregated = await limitedClient.awards.list();

    expect(requestedPages).toEqual(["?page=1&pageSize=2", "?page=2&pageSize=2"]);
    expect(aggregated.items.map(({ id }) => id)).toEqual(awards.slice(0, 3).map(({ id }) => id));
    expect(aggregated.paginationInfo).toEqual({
      page: 1,
      pageSize: 3,
      totalItems: 5,
      totalPages: 3,
    });

    requestedPages.length = 0;
    const abortController = new AbortController();
    let receivedSignal: AbortSignal | undefined;
    server.use(
      http.get("/common-grants/awards", info => {
        receivedSignal = info.request.signal;
        return paginatedHandler(info);
      })
    );

    const page = await limitedClient.awards.list({
      page: 2,
      pageSize: 2,
      signal: abortController.signal,
    });

    expect(page).toMatchObject({
      status: 200,
      message: "Success",
      items: awards.slice(2, 4).map(({ id, title }) => ({ id, title })),
      paginationInfo: { page: 2, pageSize: 2, totalItems: 5, totalPages: 3 },
      errors: [],
    });
    expect(page.items[0].createdAt).toBeInstanceOf(Date);
    abortController.abort();
    expect(receivedSignal?.aborted).toBe(true);

    let emptyRequestCount = 0;
    server.use(
      http.get(
        "/common-grants/awards",
        createPaginatedHandler({ items: [], onRequest: () => emptyRequestCount++ })
      )
    );

    const empty = await limitedClient.awards.list();

    expect(emptyRequestCount).toBe(1);
    expect(empty.items).toEqual([]);
    expect(empty.paginationInfo).toEqual({
      page: 1,
      pageSize: 0,
      totalItems: 0,
      totalPages: 0,
    });

    server.use(
      http.get("/common-grants/awards", () =>
        HttpResponse.json({ error: "Unavailable" }, { status: 503 })
      )
    );
    await expect(limitedClient.awards.list({ page: 1 })).rejects.toThrow(
      "Failed to list awards: 503"
    );

    server.use(
      http.get("/common-grants/awards", () =>
        HttpResponse.json({ status: 200, message: "Success", items: "not-an-array" })
      )
    );
    await expect(limitedClient.awards.list({ page: 1 })).rejects.toThrow();
  });

  it("partitions page-local parse failures and infers transforming schema outputs for get and list", async () => {
    const decoratedAwardSchema = AwardBaseSchema.transform(parsed => ({
      ...parsed,
      decoratedTitle: `${parsed.title} (${parsed.status.value})`,
    }));
    type DecoratedAward = z.infer<typeof decoratedAwardSchema>;

    const getOptions = {
      schema: decoratedAwardSchema,
    } satisfies AwardGetOptions<typeof decoratedAwardSchema>;
    const listOptions = {
      pageSize: 2,
      schema: decoratedAwardSchema,
    } satisfies AwardListOptions<typeof decoratedAwardSchema>;
    const firstInvalid = { ...award, id: "not-a-uuid", title: "Invalid on page one" };
    const emptyPageInvalid = { ...award, status: { value: "unknown" } };
    const secondEmptyPageInvalid = { ...award, description: 42 };
    const lastAward = {
      ...award,
      id: "123e4567-e89b-42d3-a456-426614174003",
      title: "Later Page Award",
    };
    const pages: Record<number, unknown[]> = {
      1: [award, firstInvalid],
      2: [emptyPageInvalid, secondEmptyPageInvalid],
      3: [lastAward],
    };
    const requestedPages: number[] = [];

    server.use(
      http.get("/common-grants/awards", ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get("page") ?? "1");
        requestedPages.push(page);
        return HttpResponse.json({
          status: 200,
          message: "Success",
          items: pages[page] ?? [],
          paginationInfo: { page, pageSize: 2, totalItems: 5, totalPages: 3 },
        });
      })
    );

    const fetched = await new Client({ baseUrl: "https://api.example.org" }).awards.get(
      PLAIN_ID,
      getOptions
    );
    const client = new Client({ baseUrl: "https://api.example.org" });
    const collected = await client.awards.list(listOptions);
    const thrown = await client.awards
      .list({ ...listOptions, page: 2, onParseError: "throw" })
      .catch(error => error);
    const parsedLocally = parseBatch(decoratedAwardSchema, [award, firstInvalid]);

    expectTypeOf(fetched).toEqualTypeOf<DecoratedAward>();
    expectTypeOf(collected.items).toEqualTypeOf<DecoratedAward[]>();
    expectTypeOf(parsedLocally.items).toEqualTypeOf<DecoratedAward[]>();
    expect(fetched.decoratedTitle).toBe("Community Health Center Grant (awarded)");
    expect(collected.items.map(item => item.decoratedTitle)).toEqual([
      "Community Health Center Grant (awarded)",
      "Later Page Award (awarded)",
    ]);
    expect(collected.errors.map(({ index, raw }) => ({ index, raw }))).toEqual([
      { index: 1, raw: firstInvalid },
      { index: 0, raw: emptyPageInvalid },
      { index: 1, raw: secondEmptyPageInvalid },
    ]);
    expect(requestedPages).toEqual([1, 2, 3, 2]);
    expect(thrown).toBeInstanceOf(BatchParseError);
    expect(thrown).toMatchObject({ failure: { index: 0, raw: emptyPageInvalid } });
    expect(parsedLocally.items[0].decoratedTitle).toBe("Community Health Center Grant (awarded)");
    expect(parsedLocally.errors).toMatchObject([{ index: 1, raw: firstInvalid }]);
  });
});
