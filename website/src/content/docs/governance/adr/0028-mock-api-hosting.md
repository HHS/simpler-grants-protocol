---
title: Mock API hosting
description: Records the decision to serve the fixture-backed mock CommonGrants API from the docs website itself, so the browser, curl, and the SDK all hit the same endpoint and see the same data.
---

We want visitors to test the CommonGrants API against a mock, browsable by spec version (v0.1.0–v0.4.0). The original spike ([#1034](https://github.com/HHS/simpler-grants-protocol/issues/1034)) framed this as a browser-only feature: re-enable Swagger UI's "Try it out" on the docs site. Feedback on the proof of concept ([#1049](https://github.com/HHS/simpler-grants-protocol/pull/1049)) reframed the goal as **continuity**: try a request in the browser, copy the `curl` command and run it locally, point the SDK at the same URL, and get the **same data** every time. The mock is also the natural sandbox for the quickstart — a new SDK user should be able to fetch realistic grant data with zero local setup.

That gives the mock three consumers, not one:

1. **Browser:** "Try it out" in the rendered docs.
2. **CLI:** the `curl` command copied from the docs.
3. **SDK:** the quickstart's first exercise ("use the SDK to fetch data").

A browser-only mock structurally cannot serve the last two, so the question became where a real mock endpoint should live. Two paired throwaway experiments measured the candidate shapes — a standalone Cloudflare Worker ([#1077](https://github.com/HHS/simpler-grants-protocol/issues/1077), Option 3a) and an endpoint served by the docs website itself ([#1078](https://github.com/HHS/simpler-grants-protocol/issues/1078), Option 3b). This ADR records their outcomes and the final decision.

## Decision

We serve the mock API **from the docs website itself** (Option 3b): one dynamic Astro route, mounted at `/api/v{version}/common-grants/...`, deployed with the rest of the site as a Cloudflare Worker. The site keeps `output: "static"` — every docs page is still prerendered — and the API route is the only code that runs at request time.

The deciding fact is a hosting decision made outside this ADR: on 2026-08-19 the team chose to migrate the website from GitHub Pages to Cloudflare (the switch [ADR 0003](/governance/adr/0003-website-hosting/) itself anticipated if server-side functions ever became a requirement). GitHub Pages runs no code, so while it remained the production host, the integrated shape was structurally impossible there and the experiments' original recommendation was the standalone Worker (3a). With the migration underway — name servers moved, and every merge to `main` already deploying in parallel to [beta.commongrants.org](https://beta.commongrants.org) — 3b's one decisive cost disappeared, and same-origin serving makes it the simpler shape. The details of that reversal are under [Option 3](#option-3-real-mock-endpoint-on-cloudflare-chosen-as-3b) below.

What shipped:

- **A deterministic, hand-authored fixture set** — 63 records across six resource families (25 opportunities, 11 awards, 8 organizations, 7 applications, 6 forms, 6 competitions), with working filtering, sorting, pagination, and protocol-shaped errors. Every resource keeps one record under the canonical id that Swagger UI pre-fills, so clicking Execute without touching anything returns the documented record.
- **Path-prefix versioning:** the version rides in the URL (`/api/v0.4.0/...`), so the same URL doubles as an SDK `baseUrl`. Which resources exist in which version is derived from the spec's `@added(...)` decorators (opportunities v0.1+; competitions, applications, and forms v0.2+; application search v0.3+; awards and organizations v0.4+).
- **A drift-closing conformance suite:** CI validates every fixture record, shaped per version, against the per-version JSON Schemas the docs pipeline already generates from TypeSpec — so a protocol change flags a stale fixture instead of shipping it silently.
- **Build-time wiring:** the mock's base path is injected as a `servers:` entry into the rendered OpenAPI specs from the same constant the route mounts on, so the specs cannot advertise a path the route does not serve. The URL is relative because the mock is same-origin with the docs.
- **A launch gate:** Swagger UI's Execute buttons render only when the build sets `MOCK_API_ENABLED` (today, PR previews). Production keeps them off until the GitHub Pages → Cloudflare cutover completes, since the still-live Pages deploy cannot serve the endpoint.
- **CORS headers retained** for external `curl` and SDK callers, even though same-origin serving makes them unnecessary for the docs panel itself.

### Positive consequences

- One URL and one dataset for all three consumers — the browser → `curl` → SDK round-trip that makes interactive docs valuable works by construction, and the quickstart can start from the sandbox URL with zero local setup.
- Same-origin serving eliminates the standalone shape's cross-origin plumbing: no separate origin to configure, and the `servers:` URL is derived from the constant the router mounts on rather than an environment variable that could drift.
- The website's existing harness absorbs the mock's test setup, lint/format config, and preview deploys — no second package, deploy workflow, or artifact to maintain.
- The conformance tests read the generated schemas straight off disk in the same package, with no cross-package build step.
- Still ~$0: the site's Cloudflare Worker scales to zero, and PR previews are versions of the same Worker.

### Negative consequences

- The mock is coupled to how the whole site builds and deploys: its tests run inside a package whose build takes minutes (TypeSpec compile → generate → Astro), and the Cloudflare adapter's peer requirements now set the site's `astro`/`wrangler` version floor.
- The host framework sits in front of the mock's handlers. Astro's `checkOrigin` CSRF guard answers a bare 403 to a cross-origin non-GET carrying no `Origin` header, where a standalone Worker returned a protocol-shaped 404. It stays on deliberately — only methods the mock does not serve are affected, and disabling a site-wide CSRF guard to recover a 404's wording would be the worse trade.
- The fixture records, version-shaping rules, and handler logic are hand-maintained; the conformance suite catches schema drift, but keeping the data semantically representative stays manual work.
- Shipping is sequenced behind the hosting migration: the endpoint exists on Cloudflare deploys only, so the interactive docs cannot go live on production until the DNS cutover retires the GitHub Pages deploy.
- A public endpoint, even a mock, has light operational surface (abuse limits, monitoring).

## Criteria

- **One mock for all three consumers:** same URL, same data, for the browser, `curl`, and the SDK.
- **SDK sandbox:** a real URL a new user can point the SDK at with zero local setup.
- **Fidelity:** deterministic, cross-endpoint-consistent, semantically representative responses; filters and sorting respected; protocol-shaped errors testable.
- **Versioning:** browse and mock every published spec version.
- **Cost ~$0:** no always-on server.
- **Static-first:** stays within (or close to) the static site model.
- **Low maintenance.**

## Options considered

- **Option 1: Client-side mock with MSW** — fake the network inside the visitor's browser (the proof of concept's approach).
- **Option 2: Renderer swap (Scalar / RapiDoc / Redoc)** — replace Swagger UI with a docs renderer that ships its own try-it features.
- **Option 3: Real mock endpoint on Cloudflare (chosen)** — in one of two shapes: **3a**, a standalone Worker deployed separately from the docs; or **3b**, the endpoint served by the docs website itself.
- **Option 4: Self-hosted Prism** — run Stoplight Prism as a real hosted mock server.

## Evaluation

### Side-by-side

- ✅ Criterion met
- ❌ Criterion not met
- 🟡 Partially met or unsure

| Criteria               | 1. MSW (client-side) | 2. Renderer swap | 3. Edge mock endpoint | 4. Self-hosted Prism |
| ---------------------- | :------------------: | :--------------: | :-------------------: | :------------------: |
| One mock for all three |          ❌          |        ❌        |          ✅           |          ✅          |
| SDK sandbox (real URL) |          ❌          |        ❌        |          ✅           |          ✅          |
| Fidelity               |  🟡 (with fixture)   |        🟡        |   ✅ (with fixture)   |  🟡 (dynamic mode)   |
| Versioning             |          ✅          |        ✅        |          ✅           |          ✅          |
| Cost ~$0               |          ✅          |        🟡        |          ✅           |          ❌          |
| Static-first           |          ✅          |        ✅        |          🟡           |          ❌          |
| Low maintenance        |          ✅          |        🟡        |          🟡           |          ❌          |

### Option 1: Client-side mock with MSW

:::note[Bottom line]
Client-side MSW is best if:

- we want to prioritize zero new infrastructure: everything stays static, inside the browser
- but can compromise on continuity: `curl` and the SDK can never hit it
  :::

#### How it works

- **Summary:** [Mock Service Worker](https://mswjs.io/) registers a service worker — a script the browser runs that intercepts the page's own network requests and answers them locally. The proof of concept ([#1049](https://github.com/HHS/simpler-grants-protocol/pull/1049)) proved this works end-to-end: the worker answered Swagger UI's "Try it out" across the published spec versions with no hosted component.

#### What the spike established

The proof of concept's findings carried into every later option and are worth keeping on record:

- **Auto-generating responses from the spec is not enough.** MSW's `fromOpenApi()` produces random data on every call: it cannot echo a requested id back, keep the list and detail endpoints telling the same story, apply filters or sorting, or use the `example` values our TypeSpec compiles to. These are structural limits of any schema-sampling mock, including Prism's dynamic mode.
- **The fix was a data layer, not an engine fix.** Determinism, cross-endpoint consistency, and working filters came from a hand-authored fixture plus list/detail/search handlers — and that data layer is portable. It became the kernel of both hosting experiments and ships in the chosen option.
- **The docs site's auto-generated data layer cannot substitute for the fixture.** The generated OpenAPI files, JSON Schemas, and schema metadata are all _schema-level_: they describe what an Opportunity looks like, but contain no records — no dataset, no ids, no dates to filter or sort. What that layer does do well is complement the fixture: the per-version schemas drive the mock's version shaping and back the CI conformance tests that catch drift from the TypeSpec models.
- **A browser-only mock structurally cannot serve the CLI or SDK.** The service worker exists only inside the page. `curl` and the SDK would need a separately-run local mock — a different engine returning different data, which is exactly the inconsistency the feedback flagged.

#### Tradeoffs

- **Pros**
  - Proven end-to-end by the proof of concept; ~$0, fully static, no new deploy artifact.
- **Cons**
  - Fails the continuity goal: two of the three consumers live outside the browser.
  - Needs the same hand-authored fixture layer anyway for fidelity.
  - Service-worker lifecycle (scope, navigation interference, unregister-on-leave) needs careful handling on a docs site.

### Option 2: Renderer swap (Scalar / RapiDoc / Redoc)

:::note[Bottom line]
A renderer swap is best if:

- we want one library for rendering the docs and the try-it UI
- but can compromise on the mock itself: none of them ship one for free
  :::

#### Tradeoffs

- **Pros**
  - Polished, modern try-it UIs (Scalar, RapiDoc).
- **Cons**
  - Doesn't solve the mock problem: Scalar's mock is a Node server, RapiDoc's try-it needs a live endpoint, and Redoc OSS is read-only — so we would still need MSW or a hosted endpoint.
  - A full renderer migration diverging from the [#871](https://github.com/HHS/simpler-grants-protocol/issues/871) `swagger-ui-dist` direction.

### Option 3: Real mock endpoint on Cloudflare (chosen as 3b)

:::note[Bottom line]
A real mock endpoint is best if:

- we want one URL that serves the browser, `curl`, and the SDK identically at ~$0
- and, in the integrated shape (3b), can accept the docs site needing a host that runs code
  :::

#### How it works

- **Summary:** the fixture-backed handlers run on Cloudflare's edge and answer requests at a real URL. Version selected by path prefix. Two deployment shapes were candidates: **3a**, a standalone Worker in its own package, deployed separately, called cross-origin by the docs; and **3b**, the same kernel mounted as the docs site's one dynamic Astro route, same-origin, deployed with the site.

#### What the experiments measured

Both shapes were built as throwaway experiments against the same rubric, with the deliverable being the comparison rather than merged code:

- **Surface area:** the hypothesis that the website's harness would shrink the integrated shape to "~5–6 ported files" was wrong in its original accounting, but after the hosting migration removed the GitHub Pages compatibility work, 3b measured **26 files vs. 3a's 31**. What 3b genuinely deletes is package scaffolding and deployment: the standalone package's config harness and its dedicated deploy workflow. What it adds back is entanglement — the mock now touches `astro.config.mjs`, `wrangler.jsonc`, and the site's deploy workflow.
- **Co-location helps less than expected.** The real sync wins are that the `servers:` URL and the route share one constant, and the conformance tests read the generated schemas locally. The fixture values and handler logic are hand-maintained in both shapes; only a conformance test notices a protocol change, and it is the same test either way.
- **The structural fact that decided the original recommendation:** GitHub Pages is a static file server and runs no code, and no Astro adapter changes that — an adapter only tells Astro a runtime exists somewhere. So 3b _required_ migrating the docs site to a runtime host, a hosting migration that [ADR 0003](/governance/adr/0003-website-hosting/) chose against and that should be (and was) decided on its own merits, not smuggled in as mock-API work. Under the GitHub-Pages-stays assumption, the experiments' recommendation was 3a.
- **The reversal:** on 2026-08-19 the team decided to migrate the website to Cloudflare regardless — the migration is planned work (parallel deploy on every merge, verification on beta.commongrants.org, DNS cutover, then retiring the Pages deploy), not a cost of choosing 3b. That triggered the experiment findings' own carve-out ("if the team independently decides to migrate the docs site to Cloudflare, 3b becomes the better shape"), and the 3b branch became the launch vehicle.
- **Continuity check, passed:** Swagger UI "Try it out", the copied `curl` command, and the TypeScript SDK were pointed at the same built artifact and asked for the canonical record. The Swagger UI and `curl` responses match byte for byte; the SDK returns the same record modulo its own response parsing. The check also surfaced a real SDK bug — `Client.get()` re-applied `baseUrl` to requests with query params, breaking `list()` under path-prefix versioning — fixed separately in [#1112](https://github.com/HHS/simpler-grants-protocol/issues/1112).

#### Tradeoffs

- **Pros**
  - One URL, one dataset, for all three consumers — continuity and the quickstart sandbox are met by construction.
  - Free tier, scale-to-zero; the site's harness absorbs the mock's test, lint, and deploy scaffolding.
  - Same-origin: no CORS or absolute-base-URL plumbing for the docs panel, and no second origin, account, or DNS name to own.
- **Cons**
  - Requires the docs host to run code — viable only because of the independently-decided Cloudflare migration, and gated off production until the cutover lands.
  - Mock CI pays the website's build cost, and host middleware (`checkOrigin`) sits in front of the handlers.

### Option 4: Self-hosted Prism

:::note[Bottom line]
Self-hosted Prism is best if:

- we want maximal built-in request validation from a real mock server
- but can compromise on recurring hosting cost and ongoing maintenance
  :::

#### Tradeoffs

- **Pros**
  - Real request validation and error negotiation out of the box; natively understands multiple spec files.
- **Cons**
  - Prism is Node-only — it runs on neither the browser nor Cloudflare Workers — so hosting it means a container: recurring cost and an always-on-ish service to maintain.
  - Its dynamic mode has the same random-data problem the fixture exists to solve, so the fixture layer would still be needed. Overkill for a docs-site mock.
