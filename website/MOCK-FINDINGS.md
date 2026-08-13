# Mock API playground: Option 3B findings

Findings from the **integrated endpoint** experiment ([#1078]) — the mock API served
by the docs website itself, same origin as the docs — judged against the same rubric
as the standalone-Worker experiment ([#1077], Option 3A).

Both experiments are throwaway. The deliverable is this comparison, not merged code.

**Recommendation: ship 3A, the standalone Worker.** The reasoning is in
[Recommendation](#recommendation); the short version is that 3B's central premise —
that the website's existing harness would absorb most of the Worker's surface area —
did not survive measurement, and 3B additionally forces the GitHub Pages →
Cloudflare hosting migration that [ADR-0003] flags as its real cost.

## What was built

The three opportunity endpoints (list / detail / search) served from the docs site at
`/api/v{version}/common-grants/opportunities…` for protocol versions 0.1.0–0.4.0,
with Swagger UI's "Try it out" wired to them on PR previews.

The data layer is the 3A kernel ported as-is: the 11 deterministic fixture records,
the filter/sort/pagination handlers, and the envelope/CORS helpers. Only the Worker's
entrypoint had no portable equivalent, so `src/lib/mock/router.ts` re-authors it to
mount under an `/api` base path.

`astro.config.mjs` keeps `output: "static"`. Every docs page is still prerendered at
build time; `src/pages/api/[...path].ts` is the only route with
`export const prerender = false`, and it is the only reason an adapter is needed.

## Surface area

The hypothesis in [#1078] was that the integrated shape "may cost only ~5–6 ported
files". It cost 26.

|                           | 3A (standalone Worker) | 3B (integrated endpoint) |
| ------------------------- | ---------------------- | ------------------------ |
| Files                     | 31                     | 26                       |
| Lines added               | ~4,430                 | ~4,690                   |
| New packages              | 1                      | 0                        |
| New workflows             | 1                      | 0                        |
| Existing workflows edited | 1                      | 2 (+1 shared script)     |

Both columns exclude `pnpm-lock.yaml`. So 3B is five files smaller and roughly 260
lines _larger_ — not the order-of-magnitude reduction the hypothesis anticipated.

3A's headline figure of "21 files + 1 workflow + 3 root-config edits" undercounted its
own website-side work. Counted the same way as 3B — everything the experiment touched
— 3A is 21 package files (3,872 lines) plus 10 more in `website/`, `.github/`, and
root config (557 lines): a `servers:` inject script and its spec, a `mock-server.ts`
gate module, `api-docs.astro`, a README section, two `package.json`s,
`pnpm-workspace.yaml`, and two workflows.

### What 3B genuinely deleted

Real savings, all of it package scaffolding and deployment:

- 9 files of package harness — `package.json`, two `tsconfig`s, `vitest.config.ts`,
  `eslint.config.js`, `.prettierrc`, `.gitignore`, `wrangler.jsonc`, `DEPLOYMENT.md`
  (~366 lines).
- The deploy workflow, `.github/workflows/ci-mock-api.yml` (165 lines).
- Cross-origin CORS as a _functional_ requirement: same-origin serving makes it moot
  for the docs panel, though the headers stay for external `curl`/SDK callers.

That is roughly 10 files and 530 lines of harness the website absorbed. The claim
that the website's harness absorbs the _test_ setup, lint/format config, and preview
deploy is true, and it is the strongest thing 3B has going for it.

### What 3B added back

- **The golden corpus** — `request-matrix.ts`, `golden-envelopes.json`,
  `capture-golden.ts` (473 lines). This exists _because_ 3B is a port: proving the
  moved kernel still answers exactly as the Worker did needs a captured baseline.
  A greenfield integrated mock would not carry this.
- **`router.ts` + `docs-wiring.ts` + `router.spec.ts`** (419 lines) — the re-authored
  entrypoint, the base-path/gate module, and its tests.
- **Four config surfaces the Worker never touched**: `astro.config.mjs`,
  `wrangler.jsonc`, `cd-deploy-website.yml`, and the shared
  `upload-worker-preview.sh`. Each is small; collectively they mean the mock is now
  entangled with how the whole site builds and deploys.

### The honest asterisk

3B did **not** port 3A's conformance test (`fixtures-vs-schemas.spec.ts` +
`schema-validator.ts`, 421 lines). Some of 3B's apparent slimness is missing
coverage, not efficiency. See [Sync story](#sync-story).

## Sync story

**Does co-location with the spec pipeline meaningfully help? Marginally, and less
than expected.**

What co-location genuinely buys:

- The `servers:` URL is built from `MOCK_API_BASE_PATH`, the same constant the
  endpoint routes on, so the specs cannot advertise a path the route does not serve.
  In 3A this was an environment variable carrying a full origin, which could drift.
- The generated per-version schemas are already on disk in the same package, so a
  conformance test needs no cross-package build step. 3A's equivalent had to invoke
  the website's pipeline from `mock-api/`, which [#1077-T4] called out as coupling.

What it does not buy:

- **The fixture values, the version-shaping rules, and the handler logic are still
  hand-maintained in both shapes.** Co-location does not make the mock notice that
  the protocol changed. Nothing in either experiment fails when a field is added to
  the spec; only a conformance test does that, and it is the same test either way.
- **3B currently has no conformance test at all.** This is the one place 3B is
  materially _worse_ than 3A today. Porting it is straightforward and cheap — the
  schemas are local — but until it exists, 3B's drift protection is weaker than the
  shape it is being compared against. Treat the 421 lines as owed, not saved.

## Deployment overhead

This is where the experiment produced its most decisive results. Adding
`@astrojs/cloudflare` is not a one-line change.

1. **`nodejs_compat` and `prerenderEnvironment: "node"` are both mandatory.** The
   adapter prerenders inside a workerd sandbox by default, where `process.cwd()` is
   `/`. This site derives every build-time path from `process.cwd()` via
   `src/lib/schema/paths.ts` and reads ~1,000 generated files, so the default
   configuration dies looking for its extension schemas under `/.extension-schemas`.
2. **The build output restructures.** `dist/` becomes `dist/client` (the prerendered
   site) plus `dist/server` (the Worker). `cd-deploy-website.yml` must publish
   `dist/client`, or GitHub Pages serves the site one level down and ships the Worker
   bundle as public files.
3. **The deployable wrangler config moves into the build output.** `main` cannot live
   in the checked-in `wrangler.jsonc`, because `@cloudflare/vite-plugin` validates it
   while resolving config — before the build has created it. The adapter generates
   `dist/server/wrangler.json` with the built `main` and its own `assets.directory`,
   so deploys and local previews must pass `--config dist/server/wrangler.json`.
   `upload-worker-preview.sh` gained an optional argument for this.
4. **A KV namespace is provisioned for sessions the site never uses.** The adapter
   declares a `SESSION` KV binding by default, auto-provisioned on first deploy.
5. **Redirects stop working on GitHub Pages.** The adapter converts the `redirects`
   block in `astro.config.mjs` from emitted meta-refresh HTML pages into
   `dist/client/_redirects`, which GitHub Pages does not read. All 8 redirect
   patterns — the four opp-model consolidations and the four forms migrations, 14
   rules once trailing-slash variants are expanded — stop resolving on production.

### How item 5 was established, without deploying to production

The claim is load-bearing enough to show the evidence rather than assert it:

- `@astrojs/cloudflare` calls `updateConfig({ build: { redirects: false } })`
  unconditionally in its `astro:config:setup` hook (`dist/index.js:180-182`).
  Integration config is applied over user config, which is why setting
  `build.redirects: true` in `astro.config.mjs` had no effect — the adapter wins.
- Astro's build skips emitting a redirect page exactly when that flag is off:
  `if (routeIsRedirect(route) && !config.build.redirects)` in
  `astro/dist/core/build/generate.js:332`.
- The published tree bears this out: `grep -rl 'http-equiv="refresh"' dist/client`
  matches nothing, and the `form-playground/` and `forms-new/` directories that a
  pre-adapter build produced are simply absent.
- Serving `dist/client` with a plain static file server — which is what GitHub Pages
  is — returns 404 for `/form-playground/`, `/forms-new/`, `/forms/library/`, and
  `/protocol/models/opp-base/`, while `/forms/` and `/index.html` return 200.

The one link not directly tested is that GitHub Pages ignores `_redirects`. It has no
such feature — `_redirects` is a Cloudflare Pages and Netlify convention — and the
static-server run above is the stand-in for it. Everything else is verified from
source and from the build output.

### Why this is a transition cost, not a permanent one

Worth stating plainly, because it cuts against the framing above: **after a migration
to Cloudflare, `_redirects` is strictly better than what the site has today** — real
301s instead of meta-refresh HTML. The breakage exists only in the window where the
build targets Cloudflare while production still serves from GitHub Pages.

That does not rescue 3B, but it narrows the charge. The accurate statement is not
"3B breaks redirects" but **"3B and GitHub Pages production are not simultaneously
satisfiable"**: serving a dynamic route from the docs site requires an adapter, and
that adapter assumes a host that can run one. So 3B's cost is not "add an adapter" but
"complete the hosting migration" — precisely what [ADR-0003] predicted.

### Would a different adapter avoid it?

No, and the reason is worth being precise about, since `build.redirects: false` is set
by the adapter rather than by Astro — so in principle another adapter could behave
differently.

It does not help, because the redirects are a symptom rather than the problem. GitHub
Pages serves static files; it cannot run an endpoint under any adapter. `@astrojs/node`
needs a Node server; the Netlify and Vercel adapters move hosting to those vendors.
Every option that makes the endpoint work implies a host that runs code, which is the
same migration wearing a different logo.

The genuinely different option is **no adapter**: leave the docs site fully static, and
serve the mock from its own origin. That is Option 3A.

### What a GitHub Pages → Cloudflare cutover requires

- A custom domain and DNS cutover for `commongrants.org` onto Cloudflare.
- An organization Cloudflare account with a deploy token — today's preview secrets
  are the only Cloudflare credentials in the repo, and [#1077-T5] already found they
  point somewhere other than where that experiment deployed.
- Retiring `cd-deploy-website.yml` and the `github-pages` environment, replacing them
  with a production Worker deploy.
- Accepting the full ADR-0003 conflict, which chose GitHub Pages deliberately.
- A rollback story, since DNS cutover is not a per-PR-revertible change.

None of that is mock-API work. It is a hosting migration that the mock would be
riding on, and it should be decided on its own merits.

## Risks and unknowns

- **The host framework sits in front of the kernel.** In the integrated shape,
  middleware can intercept or rewrite the mock's envelopes before they reach a
  caller; the standalone Worker has nothing in front of it. Two concrete instances
  turned up: Astro's `security.checkOrigin` answers 403 to a `PUT`/`DELETE` carrying
  no `Origin` header, where the Worker returned a protocol-shaped 404; and under
  `astro dev` (only), Vite's CORS middleware answers `OPTIONS` preflights itself with
  no `Access-Control-Allow-Origin`, so a cross-origin browser `POST` is blocked in
  dev while the same request from `curl` succeeds. Byte-identity therefore holds for
  the router but has to be re-verified at the host boundary — a structural cost 3B
  carries and 3A does not.
- **`checkOrigin` was left on deliberately** (declared explicitly in
  `astro.config.mjs` so it reads as a decision). Only methods the mock does not serve
  are affected; disabling a site-wide CSRF guard to recover a 404's exact wording
  would be the worse trade.
- **The PR preview upload is unverified end-to-end.** No Cloudflare credentials were
  available, and deploying is not something this experiment should do unattended, so
  everything was verified against the built artifact served locally by
  `wrangler dev --config dist/server/wrangler.json`. The first real preview exercises
  three untested things at once: the new `--config` argument, whether
  `dist/server/wrangler.json` survives the CI artifact round-trip, and whether a
  Worker-with-assets upload still prints the `Version Preview Alias URL` line that
  `upload-worker-preview.sh` greps for and hard-fails without.
- **Mock CI is now the website's CI.** The mock's tests run inside a package whose
  build takes minutes (TypeSpec compile → generate → Astro). 3A's package tested in
  seconds. Every mock change now pays the website's build cost.
- **`astro`/`wrangler` had to move.** The adapter's peers required `astro` 7.1.3 →
  7.2.1 and `wrangler` → 4.121.0. Both were inside their declared ranges, but the
  mock experiment now dictates the site's framework floor.
- **`MockServerInjector.inject()`'s write path has no unit coverage**, because it
  hardcodes `Paths.OPENAPI_DIR` and a test would rewrite tracked spec files. It has
  integration coverage only (two gated builds, verified then reverted).

## Continuity check

Swagger UI "Try it out", the `curl` command Swagger UI offers to copy, and the TS SDK
were each pointed at the same built artifact and asked for the canonical record
(`30a12e5e-5940-4c08-921c-17a8960fcf4b`).

| Consumer                              | Result                                   |
| ------------------------------------- | ---------------------------------------- |
| Swagger UI "Try it out" (same origin) | 200, canonical record                    |
| Copied `curl`                         | 200, byte-identical to Swagger UI        |
| TS SDK `opportunities.get()`          | 200, same record modulo SDK-side parsing |
| TS SDK `opportunities.search()`       | 200, strict `filterInfo` parse passes    |
| TS SDK `opportunities.list()`         | **fails — SDK bug, see below**           |

Swagger UI pre-fills the `oppId` box with the canonical id, so a visitor who clicks
Execute without touching the field gets the documented record. That is what the
fixture's canonical id exists for, and it works.

All three SDK auth modes were exercised against the detail endpoint and returned the
same record: `Auth.none()`, `Auth.apiKey()`, and `Auth.bearer()`. So the
`X-API-Key`/`Authorization` headers the SDK sends do reach the route untouched — worth
confirming rather than assuming, given that `checkOrigin` proved host middleware can
intercept a request before the route sees it. These are GETs, and that guard only
applies to non-GET/HEAD methods, which is why they pass.

**The wire responses are identical.** The `curl` and Swagger UI bodies match byte for
byte. The SDK's record differs in three ways, all of them the SDK's own
post-receipt parsing rather than anything about the mock:

- `competitions` is dropped — the default schema the SDK parses a detail record
  through does not include it;
- timestamps are reformatted, `2024-01-15T00:00:00Z` → `2024-01-15T00:00:00.000Z`;
- key order inside `keyDates` follows the schema rather than the response.

These would occur identically against the 3A Worker, so they are not a 3A-vs-3B
discriminator — but "all three consumers return the identical record" is only true at
the wire, not after the SDK's zod layer.

### A real SDK bug, blocking `list()`

`client.opportunities.list()` returns 404 against either shape. `Client.get()`'s
query-param branch builds `fullPath = url.pathname + url.search` — already carrying
the base path — and then `fetch()` applies `baseUrl` again, so the request goes to
`/api/v0.4.0/api/v0.4.0/common-grants/opportunities?page=1`.

This is invisible when `baseUrl` is a bare origin, which is why existing tests miss
it. It surfaces here because **path-prefix versioning is the whole point** of
`baseUrl: "https://host/v0.4.0"`. Both experiments' plans assert that an SDK
`baseUrl` "works unchanged" under this scheme; that holds for `get()` and `search()`
and is false for anything sending query params. Needs its own issue against the SDK
defect, not a mock one, and it affects 3A identically.

## Productionizing estimate

Assuming the mock itself (fixtures, handlers, versioning) is kept as-is:

| Work                                                         | Estimate                        |
| ------------------------------------------------------------ | ------------------------------- |
| Port the conformance test from 3A                            | 0.5 day                         |
| Fix the SDK base-path bug + regression test                  | 0.5 day                         |
| Redirect parity for GH Pages, or accept the regression       | 0.5 day / 0                     |
| Verify + harden the preview upload path                      | 0.5–1 day                       |
| Remaining spec resources (awards, orgs, applications, forms) | 3–5 days                        |
| Seeded fixture generation                                    | 1–2 days                        |
| **GH Pages → Cloudflare production migration**               | **separate project, 1–2 weeks** |

The first four rows are the same for either shape, give or take the redirect row. The
last row is what choosing 3B commits to, and it dwarfs everything above it.

## Recommendation

**Ship 3A, the standalone Worker.** Keep [#1077]'s PR; close this one unmerged.

3B was worth building — the premise was testable and the test came back negative:

1. **The surface-area argument does not hold.** 26 files versus 32, and more lines,
   with ~420 lines of conformance coverage still owed. The harness savings are real
   but small (~10 files), and they are paid for by config entanglement with the whole
   site's build and deploy.
2. **It forces a hosting migration.** The redirects finding is not a rough edge; it is
   structural. Production reachability for the endpoint means moving off GitHub Pages,
   contradicting ADR-0003, and that decision should not be made as a side effect of
   wanting a mock API.
3. **It puts middleware between the kernel and its callers**, so equivalence has to be
   re-established at the host boundary rather than reasoned about once.
4. **It slows the mock's own feedback loop** to the website's build time.

3B's honest advantages: no separate package, one deploy pipeline, no cross-origin
concerns for the docs panel, and a `servers:` URL needing no configured origin. Two
caveats on those last two. CORS is not eliminated — `http/cors.ts` still ships and is
still load-bearing for external `curl` and SDK callers; same-origin only makes it moot
for Swagger UI. And the configuration saving partly evaporated, because production had
to be protected with a build-time gate, which reintroduced an environment variable.

If the team independently decides to migrate the docs site to Cloudflare, this
calculus changes and 3B becomes the better shape. The work in this branch is a
usable starting point for that day. It should not be the reason for it.

## Cut for the timebox

Explicitly not done:

- The conformance test was not ported ([#1077-T4]).
- No real PR preview was deployed; verification used the built artifact locally.
- The redirect regression was not fixed — accepted and documented instead.
- The SDK `list()` bug was diagnosed and written up here, but no GitHub issue has been
  filed against `lib/ts-sdk` yet, and it is not fixed.
- `MockServerInjector.inject()`'s write path has integration coverage only.
- Non-opportunity endpoints remain unserved, so "Try it out" on the default v0.4.0
  spec answers protocol-shaped 404s for awards, organizations, applications, and
  forms.

[#1077]: https://github.com/HHS/simpler-grants-protocol/issues/1077
[#1077-T4]: https://github.com/HHS/simpler-grants-protocol/issues/1077
[#1077-T5]: https://github.com/HHS/simpler-grants-protocol/issues/1077
[#1078]: https://github.com/HHS/simpler-grants-protocol/issues/1078
[ADR-0003]: https://github.com/HHS/simpler-grants-protocol/issues/334
