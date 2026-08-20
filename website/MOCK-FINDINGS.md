# Mock API playground: Option 3B findings

Findings from the **integrated endpoint** experiment ([#1078]) — the mock API served
by the docs website itself, same origin as the docs — judged against the same rubric
as the standalone-Worker experiment ([#1077], Option 3A).

Both experiments are throwaway. The deliverable is this comparison, not merged code.

> **Superseded 2026-08-19** — the team decided to migrate the site to Cloudflare,
> which triggers the carve-out at the end of [Recommendation](#recommendation). See
> the [Addendum](#addendum-the-2026-08-19-migration-decision). The analysis below is
> kept as written.

**Recommendation: ship 3A, the standalone Worker.** The reasoning is in
[Recommendation](#recommendation); the short version is that 3B's central premise —
that the website's existing harness would absorb most of the Worker's surface area —
did not survive measurement, and 3B additionally forces the GitHub Pages →
Cloudflare hosting migration that [ADR-0003] flags as its real cost. GitHub Pages runs
no code, so no choice of adapter can serve the endpoint from it.

## Addendum: the 2026-08-19 migration decision

**The recommendation is superseded.** At the 2026-08-19 sprint planning and the
follow-up Kari/Billy 1:1, the team decided there is no concern about moving the
website off GitHub Pages onto Cloudflare. That triggers this document's own carve-out,
stated at the end of [Recommendation](#recommendation):

> If the team independently decides to migrate the docs site to Cloudflare, this
> calculus changes and 3B becomes the better shape.

The fact that changed is the analysis's fixed point: every section below treats
GitHub Pages as the immovable production host. The migration is now planned work —
parallel Cloudflare deploy on every merge, verification on `beta.commongrants.org`,
DNS cutover of the apex, then retiring the Pages deploy — so reason 2's migration
cost stops counting against 3B, and this branch becomes the launch vehicle rather
than a closed experiment.

Knock-on corrections, deliberately left uncorrected in the body (the analysis
stands as a record of what was true under the GH-Pages assumption):

- **Surface area (reason 1):** the 14-page redirect workaround is backed out of
  this branch — GH Pages compatibility is no longer a requirement, and on
  Cloudflare the adapter's generated `dist/client/_redirects` serves real 301s,
  strictly better than the meta-refresh pages
  ([The redirect fix](#the-redirect-fix) said as much). The guard test survives,
  re-pointed at `_redirects`. The same revert drops `cd-deploy-website.yml` from
  3B's column, so "existing workflows edited" is 1 (+1 shared script), matching 3A
  rather than doubling it. Dropping the 14 pages and that workflow takes the
  comparison from 41-vs-31 to **26-vs-31**, un-inverting it.
- **Deployment overhead item 5** documents a constraint that no longer binds, as do
  [How item 5 was established](#how-item-5-was-established-without-deploying-to-production)
  and [The redirect fix](#the-redirect-fix); those are historical.
  [Why no adapter can serve the endpoint from GitHub Pages](#why-no-adapter-can-serve-the-endpoint-from-github-pages)
  is **not** superseded — it is the structural reason a migration was a prerequisite
  at all, and it stays true.
- **Productionizing estimate:** the last row (GH Pages → Cloudflare migration,
  "separate project, 1–2 weeks") is now scheduled team work, not a cost of
  choosing 3B; "Redirect parity for GH Pages — done" becomes "reverted — no longer
  needed."
- **[What a cutover requires](#what-a-github-pages--cloudflare-cutover-requires)**
  is now the actual plan, and two of its worries resolved in the 1:1: the repo's
  existing `CLOUDFLARE_*` secrets deploy to the right Worker (no new account or
  token needed), and production shares the `common-grants` Worker with PR
  previews — a deploy is a versions-upload plus a traffic shift, so
  post-migration every PR preview is a not-yet-deployed version of main.

What the decision does **not** change: reasons 3 and 4 (host middleware in front
of the kernel; the mock's feedback loop tied to the website build) remain real
costs of the integrated shape, and `security.checkOrigin`'s 403-vs-404 divergence
on `PUT`/`DELETE` requests without an `Origin` header becomes permanent
production behavior. The decision accepts them.

Status: the branch has been cleaned to its post-decision shape — the workaround
is backed out and the boundary drawn, in `5c84b57`. It merges only after the
migration lands; a merge today would break the still-live GH Pages deploy, which
is exactly the sequencing risk the migration plan exists to avoid.

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
files". It cost 41.

|                           | 3A (standalone Worker) | 3B (integrated endpoint) |
| ------------------------- | ---------------------- | ------------------------ |
| Files                     | 31                     | 41                       |
| Lines added               | ~4,430                 | ~4,950                   |
| New packages              | 1                      | 0                        |
| New workflows             | 1                      | 0                        |
| Existing workflows edited | 1                      | 2 (+1 shared script)     |

Both columns exclude `pnpm-lock.yaml` and each experiment's own findings write-up.
**3B is ten files and ~520 lines _larger_ than the shape it was supposed to
undercut** — the opposite of the hypothesis, not merely short of it.

3B's 41 breaks down as 26 files for the port and the adapter, plus the 15 files
(261 lines) that fixing the redirect fallout took: 14 committed meta-refresh pages
and their guard test. Those exist only because 3B introduced an adapter, so they
belong in its column. An earlier draft of this table counted only the first 26 and
concluded 3B was "five files smaller"; that was wrong in the direction that
flattered the experiment.

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
- **15 files repairing the adapter's fallout** (261 lines) — the committed
  meta-refresh redirect pages and their guard test. Pure overhead: they restore
  behavior the site already had before the adapter arrived.

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

Adding `@astrojs/cloudflare` is not a one-line change. Two caveats before the list,
both learned the hard way: some of what follows was **misconfiguration on my part, not
adapter tax**, and a working in-house Cloudflare-hosted Astro site
([widal001/wyman-park-dell]) settled several of these faster than reading source did.
Items 1–3 are inherent; item 4 was self-inflicted and is fixed; item 5 was real and is
now fixed too. An earlier draft presented all five as the adapter's cost, which
overstated it.

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
   `dist/server/wrangler.json` with the built `main` and its own `assets.directory`.
   The build also writes `.wrangler/deploy/config.json` pointing at it, so a plain
   `wrangler deploy` in the build directory resolves it with no `--config` flag.
   That does not survive our pipeline: `.wrangler/` is gitignored and the preview
   workflow hands `dist/` between two jobs as an artifact, so the upload job has no
   `.wrangler/` to read. Hence the explicit `--config dist/server/wrangler.json` in
   `upload-worker-preview.sh` — a consequence of splitting build from deploy, not of
   the adapter.
4. ~~**A KV namespace is provisioned for sessions the site never uses.**~~
   **Self-inflicted — fixed.** The adapter injects a `SESSION` KV binding and an
   `IMAGES` binding by default, and auto-provisions the KV namespace on deploy. Both
   are avoidable from config: `session: { driver: sessionDrivers.lruCache() }` stops
   the KV binding being injected at all, and `imageService: "compile"` optimizes with
   Sharp at build time instead of requiring the Images binding and a runtime
   `/_image` endpoint. With both set, the generated config carries
   `kv_namespaces: []` and no `images` block.

   This one was worth catching rather than shipping: auto-provisioning **fails once
   the namespace exists** (`already exists [code: 10014]`), which is precisely the
   repeat-upload pattern `wrangler versions upload` uses for PR previews. Left as it
   was, previews would likely have worked once and then broken.

5. **Redirects silently stopped working on GitHub Pages — since fixed.** The adapter
   converts the `redirects` block in `astro.config.mjs` from emitted meta-refresh HTML
   pages into `dist/client/_redirects`, which GitHub Pages does not read. All 8
   redirect patterns — the four opp-model consolidations and the four forms
   migrations — stopped resolving on production. This is now fixed; see
   [The redirect fix](#the-redirect-fix). It is listed here because _discovering_ it
   cost real time, and because nothing in the test suite noticed.

### How item 5 was established, without deploying to production

The claim was load-bearing enough to show the evidence rather than assert it:

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

### The redirect fix

Committed meta-refresh HTML under `website/public/<source>/index.html`, one per
redirect source. Files in `public/` are copied verbatim into the output and never pass
through Astro's route or redirect handling, so `build.redirects: false` cannot suppress
them. The pages copy Astro's own `redirectTemplate` — same title, meta refresh, robots
directive, canonical link, and anchor fallback — so what ships is what the site emitted
before the adapter arrived, give or take prettier's formatting.

14 files: 7 for the static sources, plus 7 enumerating `/forms-new/[slug]` over the
form ids. Both hosts are now served — GitHub Pages follows the meta refresh,
Cloudflare's real 301 from `_redirects` takes precedence where it applies. Verified by
serving `dist/client` from a plain static file server: all 8 patterns return 200 with
the correct target, and real pages are unaffected.

`__tests__/redirects.spec.ts` is the guard. It reads the redirect map out of
`astro.config.mjs` and asserts a matching page exists in the built output with the
right refresh target, so adding a redirect to the config without a `public/` page
fails a test instead of silently 404ing in production. Slugs for the dynamic pattern
come from `getFormIds()` — the same list `src/pages/forms/[slug].astro` feeds to
`getStaticPaths` — rather than from directory names, which would pick up unrelated
directories. Negative-controlled: deleting one page fails exactly that case.

**This demotes item 5 from a blocker to a chore**, and an earlier draft of these
findings called it "the finding that decides the question". That was wrong: it costs
14 committed files and a guard test. The reason 3B still loses is the next section,
which the redirect symptom was only ever a vivid illustration of.

Worth adding that after a migration to Cloudflare, `_redirects` is _better_ than what
the site had before — real 301s rather than meta-refresh — so the `public/` pages
become redundant belt-and-braces at that point, not a permanent tax.

### Why no adapter can serve the endpoint from GitHub Pages

This is the part that actually decides it, and it has nothing to do with redirects.

GitHub Pages is a static file server. It serves bytes that exist in the published
tree and runs no code — no request-time execution of any kind. The mock endpoint is
defined by the opposite property: `src/pages/api/[...path].ts` sets
`prerender = false` precisely because its response depends on the request (path
version, `oppId`, query params, POST body). There is no set of files that can be
published ahead of time to answer `POST /api/v0.4.0/common-grants/opportunities/search`
for an arbitrary filter body.

An Astro adapter does not change that; it is the thing that _tells Astro a runtime
exists_. That is why the choice of adapter is irrelevant here:

- `@astrojs/cloudflare` targets Workers — code runs, but on Cloudflare, not Pages.
- `@astrojs/node` emits a Node server — something has to host and run that process.
- The Netlify and Vercel adapters relocate hosting to those vendors.

Every adapter that makes the endpoint work presupposes a host that executes requests,
and GitHub Pages is by definition not one. So the redirect breakage was never the
obstacle — it was a side effect of pointing the build at a runtime host. The obstacle
is that **the integrated shape needs the docs origin to be able to run code**, and
today it cannot.

That leaves two coherent options, which is the real decision: migrate the docs site to
a runtime host, or serve the mock from a different origin that already is one. The
second is Option 3A.

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
| Redirect parity for GH Pages                                 | done                            |
| Verify + harden the preview upload path                      | 0.5–1 day                       |
| Remaining spec resources (awards, orgs, applications, forms) | 3–5 days                        |
| Seeded fixture generation                                    | 1–2 days                        |
| **GH Pages → Cloudflare production migration**               | **separate project, 1–2 weeks** |

The first four rows are the same for either shape, give or take the redirect row. The
last row is what choosing 3B commits to, and it dwarfs everything above it.

## Recommendation

> **Superseded 2026-08-19** — see the
> [Addendum](#addendum-the-2026-08-19-migration-decision).

**Ship 3A, the standalone Worker.** Keep [#1077]'s PR; close this one unmerged.

3B was worth building — the premise was testable and the test came back negative:

1. **The surface-area argument inverts.** 41 files versus 31, ~520 more lines, and
   ~420 lines of conformance coverage still owed on top. The harness savings are real
   but small (~10 files) and are more than consumed by the adapter's fallout — the
   redirect pages alone gave back 15 files — plus config entanglement with the whole
   site's build and deploy.
2. **It forces a hosting migration.** Not because of the redirects — those are fixed —
   but because GitHub Pages runs no code, so no adapter can serve the endpoint from it.
   Production reachability means moving the docs site to a runtime host, contradicting
   ADR-0003, and that decision should be made on its own merits rather than as a side
   effect of wanting a mock API.
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
- The redirect regression **was** fixed (14 `public/` pages + a guard test), but the
  `public/` pages duplicate the redirect map in `astro.config.mjs`. The guard test
  turns that duplication into a test failure rather than a silent production 404,
  which is a mitigation, not an elimination.
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
[widal001/wyman-park-dell]: https://github.com/widal001/wyman-park-dell
