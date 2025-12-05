/**
 * MSW-like fetch mocking utilities for testing API clients.
 *
 * This module provides an API similar to MSW (Mock Service Worker) but uses
 * Vitest's vi.stubGlobal() under the hood - no additional dependencies required.
 *
 * TODO: Consider migrating to MSW (https://mswjs.io/) when the team is comfortable
 * adding the dependency. The API is intentionally similar to make migration easy:
 *
 *   Before (this module):
 *     import { http, HttpResponse, setupServer } from "./utils/mock-fetch";
 *
 *   After (MSW):
 *     import { http, HttpResponse } from "msw";
 *     import { setupServer } from "msw/node";
 *
 * @see https://mswjs.io/docs/getting-started
 */

import { vi } from "vitest";

// ============================================================================
// Types
// ============================================================================

export interface RequestInfo {
  url: string;
  method: string;
  headers: Headers;
  params: Record<string, string>;
  request: Request;
}

export type RequestHandler = (info: RequestInfo) => Response | Promise<Response>;

export interface HttpHandler {
  method: string;
  path: string | RegExp;
  handler: RequestHandler;
}

// ============================================================================
// HttpResponse - Similar to MSW's HttpResponse
// ============================================================================

export const HttpResponse = {
  /**
   * Creates a JSON response.
   *
   * @example
   * HttpResponse.json({ id: "123", name: "Test" })
   * HttpResponse.json({ error: "Not found" }, { status: 404 })
   */
  json(body: unknown, init?: ResponseInit): Response {
    return new Response(JSON.stringify(body), {
      status: init?.status ?? 200,
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(new Headers(init?.headers).entries()),
      },
    });
  },

  /**
   * Creates a text response.
   */
  text(body: string, init?: ResponseInit): Response {
    return new Response(body, {
      status: init?.status ?? 200,
      headers: {
        "Content-Type": "text/plain",
        ...Object.fromEntries(new Headers(init?.headers).entries()),
      },
    });
  },

  /**
   * Creates an error response.
   */
  error(): Response {
    return Response.error();
  },
};

// ============================================================================
// Pagination test helpers
// ============================================================================

/**
 * Options for creating a paginated endpoint handler.
 */
export interface PaginatedHandlerOptions<T> {
  /** The items to paginate through */
  items: T[];
  /** Default page size if not specified in request (default: 25) */
  defaultPageSize?: number;
  /** Optional callback invoked on each request (useful for tracking request count) */
  onRequest?: () => void;
}

/**
 * Creates a handler that returns paginated responses from an array of items.
 *
 * Reads `page` and `pageSize` from query parameters and returns the appropriate
 * slice of items with correct pagination metadata.
 *
 * @example
 * ```ts
 * const items = [{ id: "1" }, { id: "2" }, { id: "3" }];
 * let requestCount = 0;
 *
 * server.use(
 *   http.get("/items", createPaginatedHandler({
 *     items,
 *     defaultPageSize: 2,
 *     onRequest: () => requestCount++,
 *   }))
 * );
 * ```
 */
export function createPaginatedHandler<T>(options: PaginatedHandlerOptions<T>): RequestHandler {
  const { items, defaultPageSize = 25, onRequest } = options;

  return ({ url }) => {
    onRequest?.();

    const urlObj = new URL(url);
    const page = parseInt(urlObj.searchParams.get("page") || "1");
    const pageSize = parseInt(urlObj.searchParams.get("pageSize") || String(defaultPageSize));

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = items.slice(start, end);

    return HttpResponse.json({
      status: 200,
      message: "Success",
      items: pageItems,
      paginationInfo: {
        page,
        pageSize,
        totalItems: items.length,
        totalPages: Math.ceil(items.length / pageSize),
      },
    });
  };
}

// ============================================================================
// http - Similar to MSW's http namespace
// ============================================================================

function createHandler(
  method: string,
  path: string | RegExp,
  handler: RequestHandler
): HttpHandler {
  return { method, path, handler };
}

export const http = {
  /**
   * Creates a GET request handler.
   *
   * @example
   * http.get("/opportunities/:id", ({ params }) => {
   *   return HttpResponse.json({ id: params.id });
   * })
   */
  get(path: string | RegExp, handler: RequestHandler): HttpHandler {
    return createHandler("GET", path, handler);
  },

  /**
   * Creates a POST request handler.
   */
  post(path: string | RegExp, handler: RequestHandler): HttpHandler {
    return createHandler("POST", path, handler);
  },

  /**
   * Creates a PUT request handler.
   */
  put(path: string | RegExp, handler: RequestHandler): HttpHandler {
    return createHandler("PUT", path, handler);
  },

  /**
   * Creates a PATCH request handler.
   */
  patch(path: string | RegExp, handler: RequestHandler): HttpHandler {
    return createHandler("PATCH", path, handler);
  },

  /**
   * Creates a DELETE request handler.
   */
  delete(path: string | RegExp, handler: RequestHandler): HttpHandler {
    return createHandler("DELETE", path, handler);
  },

  /**
   * Creates a handler that matches any HTTP method.
   */
  all(path: string | RegExp, handler: RequestHandler): HttpHandler {
    return createHandler("*", path, handler);
  },
};

// ============================================================================
// setupServer - Similar to MSW's setupServer
// ============================================================================

/**
 * Extracts path parameters from a URL given a path pattern.
 *
 * @example
 * extractParams("/opportunities/:id", "/opportunities/123")
 * // => { id: "123" }
 */
function extractParams(pattern: string | RegExp, pathname: string): Record<string, string> | null {
  if (pattern instanceof RegExp) {
    const match = pathname.match(pattern);
    return match ? {} : null;
  }

  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(":")) {
      params[patternPart.slice(1)] = pathPart;
    } else if (patternPart !== pathPart) {
      return null;
    }
  }

  return params;
}

/**
 * Creates a mock server with the given request handlers.
 * API is similar to MSW's setupServer for easy future migration.
 *
 * @example
 * const server = setupServer(
 *   http.get("/opportunities/:id", ({ params }) => {
 *     return HttpResponse.json({ id: params.id, title: "Test Grant" });
 *   }),
 *   http.get("/opportunities", () => {
 *     return HttpResponse.json({ data: [] });
 *   })
 * );
 *
 * beforeAll(() => server.listen());
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 */
export function setupServer(...handlers: HttpHandler[]) {
  let currentHandlers: HttpHandler[] = [...handlers];
  let isListening = false;

  const findHandler = (
    method: string,
    url: string
  ): { handler: HttpHandler; params: Record<string, string> } | null => {
    const pathname = new URL(url).pathname;

    for (const h of currentHandlers) {
      if (h.method !== "*" && h.method !== method) {
        continue;
      }

      const params = extractParams(h.path, pathname);
      if (params !== null) {
        return { handler: h, params };
      }
    }

    return null;
  };

  const mockFetch = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = request.url;
    const method = request.method;

    const match = findHandler(method, url);

    if (!match) {
      return HttpResponse.json({ error: "No handler found", url, method }, { status: 404 });
    }

    const requestInfo: RequestInfo = {
      url,
      method,
      headers: request.headers,
      params: match.params,
      request,
    };

    return match.handler.handler(requestInfo);
  };

  return {
    /**
     * Starts intercepting fetch requests.
     */
    listen() {
      if (isListening) return;
      vi.stubGlobal("fetch", mockFetch);
      isListening = true;
    },

    /**
     * Stops intercepting fetch requests and restores the original fetch.
     */
    close() {
      if (!isListening) return;
      vi.unstubAllGlobals();
      isListening = false;
    },

    /**
     * Resets handlers to the initial handlers passed to setupServer.
     */
    resetHandlers() {
      currentHandlers = [...handlers];
    },

    /**
     * Adds runtime request handlers (prepended to give them priority).
     * Useful for overriding handlers in specific tests.
     *
     * @example
     * it("handles server errors", async () => {
     *   server.use(
     *     http.get("/opportunities/:id", () => {
     *       return HttpResponse.json({ error: "Server error" }, { status: 500 });
     *     })
     *   );
     *   // This test will now get 500 errors
     * });
     */
    use(...runtimeHandlers: HttpHandler[]) {
      currentHandlers = [...runtimeHandlers, ...currentHandlers];
    },
  };
}
