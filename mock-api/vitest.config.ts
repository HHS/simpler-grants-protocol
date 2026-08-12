import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node, not `@cloudflare/vitest-pool-workers`: the handler is a pure
    // `fetch(Request) => Response` over standard Fetch API globals, so Node 22
    // reproduces it faithfully and the suite stays dependency-free. If a later
    // ticket reaches for Workers-only semantics (env bindings, `ctx.waitUntil`,
    // `request.cf`), Node's globals won't cover them and this needs revisiting.
    environment: "node",
    exclude: ["dist/**", "node_modules/**"],
    isolate: false,
  },
});
