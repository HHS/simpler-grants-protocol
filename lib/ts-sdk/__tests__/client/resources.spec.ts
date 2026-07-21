import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { z } from "zod";
import { http, HttpResponse, setupServer } from "../utils/mock-fetch";
import { Client, Resource } from "../../src/client";

const server = setupServer();
const client = new Client({ baseUrl: "https://api.example.org" });

// Test-only subclass proving the write-verb mechanism: a bespoke verb is a
// one-liner over the base `mutate` primitive, carrying its own schemas.
class Widgets extends Resource<{ id: string }> {
  replace(id: string, body: unknown) {
    return this.mutate("put", `/widgets/${id}`, body, {
      requestSchema: z.object({ name: z.string() }),
      responseSchema: z.object({ id: z.string() }),
    });
  }
}

const WidgetItemSchema = z.object({ id: z.string() });

describe("Resource.mutate", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("round-trips a valid body through the transport verb", async () => {
    let capturedBody: unknown;

    server.use(
      http.put("/widgets/w-1", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id: "w-1" });
      })
    );

    const widgets = new Widgets(client, WidgetItemSchema);
    const result = await widgets.replace("w-1", { name: "New Widget" });

    expect(capturedBody).toEqual({ name: "New Widget" });
    expect(result).toEqual({ id: "w-1" });
  });

  it("validates the body before the request (fail-fast)", async () => {
    let requested = false;

    server.use(
      http.put("/widgets/w-1", () => {
        requested = true;
        return HttpResponse.json({ id: "w-1" });
      })
    );

    const widgets = new Widgets(client, WidgetItemSchema);

    await expect(widgets.replace("w-1", { name: 42 })).rejects.toThrow(z.ZodError);
    expect(requested).toBe(false);
  });

  it("parses the response fail-hard", async () => {
    server.use(
      http.put("/widgets/w-1", () => {
        return HttpResponse.json({ wrong: "shape" });
      })
    );

    const widgets = new Widgets(client, WidgetItemSchema);

    await expect(widgets.replace("w-1", { name: "New Widget" })).rejects.toThrow(z.ZodError);
  });
});
