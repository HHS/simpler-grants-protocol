---
title: API version negotiation
description: ADR documenting the decision to select a CommonGrants protocol version with a request header, advertise supported versions at a discovery route, and announce retirement with standard HTTP headers.
tableOfContents:
  maxHeadingLevel: 3
---

A CommonGrants API can serve more than one protocol version, and clients built against different versions need to ask for the one they were built for. The protocol defines no way to do that today. A client can't ask for a version, can't find out which versions a server supports, and can't confirm which version a response was served in. The mock API selects a version by path prefix ([ADR 0028](https://commongrants.org/governance/adr/0028-mock-api-hosting/)), but production APIs have no shared convention.

This decision covers three areas: discovering supported versions, requesting a specific version, and retiring a version, which includes changing a server's default. How the SDKs support versioning is a separate decision.

## Overview

### Questions

**Clients**

- Discovering supported versions
  - How do I find out which versions a server supports?
  - Does every route support the same versions?
- Requesting a specific version
  - How do I ask for a version?
  - What happens if I don't ask?
  - How do I know which version I got?
  - What errors can I get, and how do I recover?
- Retiring a version
  - How will I hear that a version is retiring?
  - How will I hear that the default is changing?
  - What happens after a version is retired?

**Implementers**

- Discovering supported versions
  - When must I publish discovery?
  - What does listing a version promise?
  - What goes in discovery while a change is pending?
- Requesting a specific version
  - How do I resolve the requested version?
  - Which errors do I return, and in what order do I check?
  - Which headers must my responses carry?
- Retiring a version
  - How do I change my default?
  - How do I retire a version, server-wide or for one route?

### Use cases

- **An aggregator** pulls opportunities from many servers. Before it sends a request, it needs to know which versions each server and each route serves, so it can pick one it understands.
- **A vendor upgrading one route.** A grants platform adds the 0.5.0 form list while every other route stays on 0.4.0. It needs to say so truthfully without moving every route at once.
- **A client that never sends a version.** An existing integration written before negotiation existed has to keep getting the contract it already uses, whatever versions the server adds later.
- **A browser app on another origin** calls the API directly. It needs to send the version and read which version it got.
- **A long-running integration on an old version** needs warning before that version stops responding, and needs to know what to move to.
- **A host API that mounts CommonGrants routes** under its own versioned paths, such as `/api/v2/common-grants/...`, needs the two versions to stay independent.

### Criteria

- **Many versions is the easy standard:** serving several versions, or upgrading one route at a time, should cost a server as little as possible.
- **Existing clients keep working:** a client that has never sent a version keeps getting the contract it already uses.
- **Predictable before the request:** a client can tell whether a request will work before sending it.
- **One contract per response:** a response never mixes versions, and the client can tell which version it got.
- **Minimum mandatory surface:** new obligations fall only on servers whose behavior creates the need.
- **Conform by default:** reuse the existing envelopes, route status tags, route prefix, and IETF headers.
- **Stable resource identity:** a resource has one URL across versions, so stored links and cross-references don't depend on a version.
- **Change locality:** a release that changes some routes leaves the URLs of every other route untouched.
- **Works inside a host API:** CommonGrants routes can be mounted inside a host API that has its own paths and versioning.
- **Tooling fit:** expressible in TypeSpec and OpenAPI, usable from Swagger UI and curl, and checkable by `cg check`.
- **Cache- and browser-safe:** shared caches never return one version's response for another, and browser clients can read the version metadata.
- **Shareable URLs:** a URL pasted into a browser, bug report, or docs page reproduces the same version.
- **Implementation cost:** simple for adopters to route and validate in the frameworks the protocol supports.

### Options considered

| Question                               | Options                                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Where the version travels              | **Request header**; path segment; query parameter; media type; header with a query-parameter fallback                          |
| Header names                           | **`CG-Version` and `CG-Version-Served`**; `CommonGrants-Version`; `Accept-Version`; `X-CG-Version`; one name for both          |
| Version format                         | **Full 0.5.0, matched on major and minor**; full 0.5.0, matched exactly; patch always 0; major.minor 0.5; accept both          |
| What supporting a version promises     | API-wide list; **baseline plus per-route entries**; full per-route list                                                        |
| Discovery route status                 | Optional, SHOULD for multi-version servers; **optional, MUST for multi-version servers**; required                             |
| Version metadata on ordinary responses | **Served version only**; plus a required supported-versions header; plus an optional one                                       |
| Served version in the response body    | **Headers only**; headers plus a metadata block in the envelope                                                                |
| No version sent                        | **Pinned default per server**; latest; oldest; version required                                                                |
| Version error status                   | One status for every error; **400 or 406 by case**; 400/406 plus 410 for retired versions                                      |
| Retiring a default                     | Reject requests without a version; move only to a compatible version; **move forward**                                         |
| Announcing a default change            | **`successor-version` link**; a CommonGrants link relation; Deprecation and Sunset redefined; only by retiring the old default |
| Removing a version from one route      | No notice required; **the same process as the whole server**                                                                   |

Selected options are in bold. The [Evaluation](#evaluation) section compares them.

### Decision

A client chooses a CommonGrants version by sending it in an optional request header, `CG-Version`. A server publishes the versions it serves at a discovery route, as a baseline plus per-route exceptions. Every response confirms the version it was served in, clients that send no version get a pinned default, and version problems get dedicated error codes. Retirement uses the standard IETF headers with their standard meaning.

We recommend that servers move all their routes to a new version at the same time. The protocol doesn't require it: a server can serve different versions on different routes and advertise those exceptions in discovery.

#### Discovering supported versions

- A server publishes `GET /common-grants/versions`: a baseline (the default version and the versions every route serves) plus entries for routes that differ, in the standard success envelope.
- The route is optional, and required for servers that serve more than one version. It SHOULD be readable without authentication.
- It takes no request parameters, ignores `CG-Version`, and never returns a version error.
- Optional lifecycle fields appear while a change is pending: the upcoming default and its date, and deprecated versions with their deprecation and sunset dates. Dates use RFC 3339.
- Fields are only ever added, and clients ignore fields they don't recognize.
- Ordinary responses don't carry a supported-versions header. Discovery and unsupported-version errors carry the list.

#### Requesting a specific version

- A client selects a version only with the `CG-Version` request header: no path segment, query parameter, or media type. Each request carries one value.
- The header applies only to protocol routes under `/common-grants/`. Custom routes and the discovery route ignore it.
- A version is a full published version, such as `0.5.0`. Servers match on major and minor, so a request for `0.5.0` is served by a server hosting `0.5.1`. A server never substitutes a different major or minor version.
- A request without the header is served in the server's pinned default. A server adopting negotiation sets its default to the version it already serves, and adding versions never moves it.
- Every response produced after a version is selected carries `CG-Version-Served` with the full version served. The served version travels in headers only, so response bodies don't change.
- Version problems return `version.malformed` (400), `version.unsupported` (406), `version.retired` (406), or `version.conflict` (400), never 404 or 410.
- Cacheable responses carry `Vary: CG-Version`, and cross-origin servers allow and expose the version headers.

#### Retiring a version

- **Retiring a version:** responses served in it carry `Deprecation`, `Sunset`, and `Link` headers, with their standard IETF meaning, and discovery lists it as deprecated. After the sunset date, requests for it get `version.retired`.
- **Changing the default:** responses served by default carry a `Link` with `rel="successor-version"`, and discovery shows the upcoming default and its date. Clients that send a version see no change.
- A retiring default moves forward to the next newer version no later than the sunset. A server can't retire its default without a newer version to move to.
- A single route retires a version the same way as the whole server. Experimental routes are exempt.

### Consequences

- **Positive consequences**
  - Resource URLs never change across versions, so links stored in grant systems stay valid, and a host API keeps its own path scheme.
  - Existing clients keep working without changes: a server adopting negotiation keeps serving them the version they already use.
  - A server can upgrade one route at a time and say so truthfully, and a client can predict a route's versions before calling it.
  - Every response says which version it is, and an unconfirmed response is recognizable as unconfirmed.
  - Retirement uses headers that existing HTTP tooling already understands, with their standard meaning.
  - The 0.6.0 contract is purely additive. The version headers and errors are added in 0.6.0, and the published 0.1.0 through 0.5.0 contracts don't change.
- **Negative consequences**
  - A URL alone doesn't reproduce a version. Bug reports, docs examples, and curl commands have to include the header.
  - Servers behind shared caches or CDNs need `Vary: CG-Version`, and some CDNs need the header added to their cache key.
  - Cross-origin servers need CORS configuration for the version headers.
  - Discovery dates use RFC 3339, `Deprecation` uses the `@<unix-timestamp>` form, and `Sunset` uses HTTP-date. Client parsers and the docs have to handle all three.
  - A client that sends no version accepts that its default can move. Before 1.0 the new default may not be compatible with the old one.
  - The specification's versioning section describes a patch as adding "new optional functionality," which contradicts the patch rule here. It needs correcting alongside this decision.

## Evaluation

### Side-by-side

- ✅ Criterion met
- ❌ Criterion not met
- 🟡 Partially met or unsure

Where the version travels:

| Criteria                           | Header | Path | Query parameter | Media type | Header + query |
| ---------------------------------- | :----: | :--: | :-------------: | :--------: | :------------: |
| Stable resource identity           |   ✅   |  ❌  |       🟡        |     ✅     |       🟡       |
| Change locality                    |   ✅   |  ❌  |       ✅        |     ✅     |       ✅       |
| Many versions is the easy standard |   ✅   |  ❌  |       ✅        |     ✅     |       ✅       |
| Works inside a host API            |   ✅   |  ❌  |       ✅        |     🟡     |       ✅       |
| Tooling fit                        |   ✅   |  ✅  |       ✅        |     🟡     |       🟡       |
| Cache- and browser-safe            |   🟡   |  ✅  |       🟡        |     ❌     |       🟡       |
| Shareable URLs                     |   ❌   |  ✅  |       ✅        |     ❌     |       ✅       |
| Existing clients keep working      |   ✅   |  🟡  |       ✅        |     ✅     |       ✅       |
| Implementation cost                |   ✅   |  ✅  |       ✅        |     🟡     |       ❌       |

What supporting a version promises:

| Criteria                           | API-wide | Baseline plus entries | Full per-route |
| ---------------------------------- | :------: | :-------------------: | :------------: |
| Many versions is the easy standard |    ❌    |          ✅           |       🟡       |
| Predictable before the request     |    🟡    |          ✅           |       ✅       |
| Minimum mandatory surface          |    ✅    |          ✅           |       ❌       |

### Discovering supported versions

#### What supporting a version promises

##### Option 1: API-wide list — Rejected

:::note[Bottom line]
An API-wide list is best if:

- we want the simplest possible discovery response
- but can compromise on servers upgrading one route at a time
  :::

- **Pros**
  - One list and one default answer every question.
- **Cons**
  - A server that upgrades one route can't say so. It has to upgrade every route together, or serve the new version without advertising it.
  - A route that exists only in a newer version can't be listed at all.

##### Option 2: Baseline plus per-route entries — Selected

:::note[Bottom line]
A baseline plus per-route entries is best if:

- we want servers to upgrade one route at a time and say so truthfully
- but can compromise on clients doing one lookup per route
  :::

- **Pros**
  - A server whose routes all match the baseline publishes the same thing it would under an API-wide list, so it pays nothing extra.
  - The baseline stays a compliance claim, because every route a baseline version requires serves that version.
- **Cons**
  - Clients check for a route's entry before using the baseline.
  - A hand-maintained entry can go stale when the baseline moves. Generating discovery from the routes a server registers removes that risk.

Describing the top-level list as a baseline matters even for servers with no entries. If it instead promised that every route serves every listed version, adding per-route entries later would change what an existing field means.

##### Option 3: Full per-route list — Rejected

:::note[Bottom line]
A full per-route list is best if:

- we want an exact inventory of every route and version
- but can compromise on every server listing every route and every client computing which versions its routes share
  :::

- **Pros**
  - The most precise option, and it doubles as an inventory of implemented routes.
- **Cons**
  - Nothing answers which version the API speaks.
  - Every server lists every route, even when they all match.

#### Discovery route status

##### Optional, MUST for multi-version servers — Selected

Clients get a guarantee where it matters, because per-route entries appear only in discovery. Servers that serve one version take on nothing and stay compliant. Route status tags can't express the condition, so it lives in the specification text while the route is tagged optional.

##### Optional, SHOULD for multi-version servers — Rejected

A client can't count on discovery even from a server that serves several versions.

##### Required — Rejected

The specification classifies adding a required route as a major change, and single-version servers gain nothing from it. Clients need a fallback for servers without discovery for years either way.

#### Version metadata on ordinary responses

##### Served version only — Selected

The useful prompt to upgrade is that the served version is going away, and `Deprecation` and `Sunset` already carry it. Discovery and unsupported-version errors carry the supported versions.

##### Required supported-versions header — Rejected

Lets a long-running client notice new versions without re-reading discovery. But clients that never send a version, the ones that most need the prompt, won't read a new header either. It's a second source that must agree with discovery, and servers on different builds during a rolling deploy can return different lists. Adding it later is additive if clients ask for it.

##### Optional supported-versions header — Rejected

A header clients can't count on doesn't give them a dependable prompt.

### Requesting a specific version

#### Where the version travels

##### Option 1: Request header — Selected

:::note[Bottom line]
A request header is best if:

- we want stable URLs for every resource, per-route versions, and one documented route with a version history
- but can compromise on shareable version-specific URLs and on setting a `Vary` header
  :::

GitHub (`X-GitHub-Api-Version`), Stripe (`Stripe-Version`), and OpenStack (`OpenStack-API-Version`) all select the version with a request header.

- **Pros**
  - Resource URLs never change, so links stored in grant systems, bookmarks, and cross-references stay valid across versions.
  - A host API keeps its own path scheme. CommonGrants routes mount under `/common-grants/` whatever the host does with versions.
  - Per-route versions and per-route defaults work without a URL per combination.
  - A server that serves one version needs very little code: it checks the header, rejects other major and minor versions, and reports what it serves.
  - Declared once in the core library and present on every operation, so docs, `cg check`, and the SDKs all see it.
- **Cons**
  - A URL alone doesn't reproduce a version: a resource link copied from a 0.5.0 request reopens in the default. Version-specific shareable links are an uncommon need for grant data, and the docs site's own `?version=` selector covers the sandbox case.
  - Caches need `Vary: CG-Version`, and some CDNs need the header added to their cache key.
  - Browser clients need CORS to allow and expose the headers.
  - Not visible in default access logs without configuration.

##### Option 2: Path segment — Rejected

:::note[Bottom line]
A path segment is best if:

- we want the version visible in every URL, log line, and cache key with no setup
- but can compromise on a copy of every URL per version, stacked version segments inside host APIs, and moving every route at once on each release
  :::

Kubernetes serves resources under a group and version, such as `/apis/apps/v1/deployments`, and our mock API uses this pattern today.

- **Pros**
  - Shareable, cacheable, and visible everywhere without configuration.
  - The simplest thing to route in any framework.
- **Cons**
  - Every resource gets a URL per version, so stored links go stale and cross-references between resources have to agree on a version.
  - Inside a host API with its own path versioning, the URL carries two versions, such as `/api/v2/common-grants/v0.5/opportunities`.
  - Per-route versions and per-route defaults can't be expressed, because a path is all one version.
  - Every route moves on every release, and docs repeat every route per version.

##### Option 3: Query parameter — Rejected

:::note[Bottom line]
A query parameter is best if:

- we want the version visible in shareable URLs while paths stay stable
- but can compromise on a parameter declared on every operation, CDNs that ignore query strings by default, and a version error that looks like any other bad request
  :::

Azure Resource Manager requires `api-version` on every request.

- **Pros**
  - Stable paths and shareable URLs at the same time.
  - Easy to use from a browser address bar and in docs examples.
- **Cons**
  - A version that isn't part of the resource's identity still ends up in its URL, so two links to one record differ.
  - Strict servers reject unknown query parameters with a plain 400, which a client can't tell apart from a version error on servers that predate negotiation.
  - Crowds query strings that already carry pagination, sorting, and filters, and collides with host APIs that use the same name.
  - Every version error has to be a 400, because 406 is tied to request headers.

##### Option 4: Media type — Rejected

:::note[Bottom line]
Media type negotiation is best if:

- we want to follow HTTP content negotiation strictly
- but can compromise on tooling support, shareable URLs, and cache efficiency
  :::

GitHub's legacy `application/vnd.github.v3+json` worked this way before GitHub replaced it with a dedicated header.

- **Pros**
  - Uses HTTP's own content negotiation, with no new header.
- **Cons**
  - Touches every content type the protocol declares, including the `application/merge-patch+json` routes from [ADR 0026](https://commongrants.org/governance/adr/0026-org-profile-syncing/).
  - Swagger UI and most client generators handle media type parameters poorly.
  - `Vary: Accept` fragments caches far more than a single custom header does.

##### Option 5: Header with a query-parameter fallback — Rejected

:::note[Bottom line]
Accepting both is best if:

- we want shareable links in addition to stable paths
- but can compromise on two carriers to validate, document, and support in every SDK and template
  :::

- **Pros**
  - Shareable links without giving up stable paths.
- **Cons**
  - Two carriers double the validation rules (which wins when both are present, and what a conflict means), the docs, the test matrix, and the SDK support for each.
  - Caches would need to key on both.
  - Shareable links are the only criterion it adds, and the docs site's own `?version=` selector serves that need better than a protocol-level carrier.

#### Header names

Each header follows the closest published standard or precedent:

| Header                                                                  | Direction | Purpose                                                       | Standard or precedent                                                                                                                                                                                                         | Deviation and rationale                                                                                                                                                                               |
| ----------------------------------------------------------------------- | --------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CG-Version`                                                            | Request   | The version the client wants, such as `0.5.0`                 | Vendor-prefixed request header, as in `Stripe-Version`, `X-GitHub-Api-Version`, and `OpenStack-API-Version`. No `X-` prefix, per [RFC 6648](https://www.rfc-editor.org/rfc/rfc6648)                                           | Short, pairs with `CG-Version-Served`, and avoids colliding with `Accept-Version`, which other APIs use for their own versions                                                                        |
| `CG-Version-Served`                                                     | Response  | The full version actually served, including by default        | GitHub's `X-GitHub-Api-Version-Selected`; Shopify's `X-Shopify-API-Version`, which reflects the version used to fulfill the request; OpenStack echoes `OpenStack-API-Version` with the executed version                       | "Served" rather than GitHub's "Selected", because it also covers the default, where the client selected nothing                                                                                       |
| `Vary: CG-Version`                                                      | Response  | Keys shared caches on `CG-Version`                            | [RFC 9110 §12.5.5](https://www.rfc-editor.org/rfc/rfc9110#section-12.5.5): an origin server SHOULD send `Vary` on a cacheable response that depends on a request header. OpenStack always sends `Vary: OpenStack-API-Version` | GitHub and Stripe omit their version header from `Vary`. CommonGrants requires it on cacheable responses, because the protocol can't know an implementer's caching setup and the header costs nothing |
| `Deprecation`                                                           | Response  | The served version is deprecated                              | [RFC 9745](https://www.rfc-editor.org/rfc/rfc9745), with a Structured Field Date value such as `@1796083200`                                                                                                                  | None. GitHub uses the same name with an HTTP-date value, the format from before the RFC was published. CommonGrants follows the RFC                                                                   |
| `Sunset`                                                                | Response  | When the served version stops responding                      | [RFC 8594](https://www.rfc-editor.org/rfc/rfc8594), with an HTTP-date value. GitHub uses the same header and format                                                                                                           | None. RFC 8594 says Sunset isn't appropriate for a version that's no longer preferred but still operational, so it isn't used for a default change                                                    |
| `Link` with `rel="deprecation"` and `rel="sunset"`                      | Response  | Migration documentation                                       | [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288). Both relation types are IANA-registered, by RFC 9745 and RFC 8594                                                                                                         | None                                                                                                                                                                                                  |
| `Link` with `rel="successor-version"`                                   | Response  | Announces a change of default on responses served by default  | [RFC 5829](https://www.rfc-editor.org/rfc/rfc5829), IANA-registered: points to a resource containing the successor version                                                                                                    | A registered relation instead of a CommonGrants relation URI, which RFC 8288 allows but no tooling recognizes. The header says a successor exists; the date lives in discovery                        |
| `Link` with `rel="version-history"`                                     | Response  | Points to the discovery route                                 | RFC 5829, IANA-registered: points to a resource containing the version history                                                                                                                                                | None. Sent alongside `Deprecation` and `successor-version`, so a client can find what to move to without reading docs                                                                                 |
| CORS `Access-Control-Allow-Headers` and `Access-Control-Expose-Headers` | Response  | Lets browsers send `CG-Version` and read the version metadata | The [Fetch Standard](https://fetch.spec.whatwg.org/#cors-safelisted-request-header) allows only a few request headers without a preflight, so `CG-Version` needs allow-listing                                                | None                                                                                                                                                                                                  |

##### `CG-Version` and `CG-Version-Served` — Selected

Short, paired, and `cg` is already the CLI's name. The specification text spells out what CG means. A distinct served-version name says what it means and can't be mistaken for an echo of the request.

##### `CommonGrants-Version` — Rejected

Clearer to a reader who has never seen the protocol, but long on every request, and the pair `CommonGrants-Version-Served` is longer still.

##### `Accept-Version` — Rejected

Reads as a standard header but isn't one, and would collide with other APIs that use the same name for their own versions.

##### `X-CG-Version` — Rejected

The `X-` convention is deprecated by RFC 6648. GitHub still uses one, but we have no legacy header to stay compatible with.

##### One name for the request and the served version — Rejected

OpenStack's approach. It gives clients one name to learn, but requested and served values share a name in logs and captures.

#### Version format

##### Full 0.5.0, matched on major and minor — Selected

Clients and servers use the same full version string as the protocol's version list, the published OpenAPI documents, and the CLI, and the server reports exactly what it hosts. Because a patch never changes the contract, matching on major and minor means a patch release never breaks a client or forces a server to list extra versions. Caches keep separate entries for requests that differ only in the patch number, which costs some cache efficiency but never returns the wrong contract.

##### Full 0.5.0, matched exactly — Rejected

The first time the protocol publishes a patch, a server hosting 0.5.1 rejects clients sending 0.5.0 for an identical contract, or has to list every patch it could serve.

##### Patch always 0 — Rejected

Keeps exact matching simple, but leaves the third number permanently meaningless and stops a server from reporting the patch it actually hosts.

##### Major.minor 0.5 — Rejected

Adds a second format beside the one the protocol's version list, OpenAPI documents, and CLI already use.

##### Accept both — Rejected

Two formats for one contract double the test matrix and the parsing rules.

#### Served version in the response body

##### Headers only — Selected

`CG-Version-Served` already confirms the version, and the envelopes stay exactly as they are in every version, which keeps the 0.6.0 schemas a pure addition.

##### Headers plus a metadata block in the envelope — Deferred

A client that never inspects headers would still see the version it got. But it duplicates the header, changes every envelope schema, and the SDKs read headers anyway. Worth revisiting if we find clients that can't read response headers, which exposing them through CORS is meant to prevent.

#### No version sent

##### Pinned default per server — Selected

The only option that keeps existing clients on the contract they use, whatever versions the server adds later.

##### Latest — Rejected

A client that sends no version gets new and possibly breaking changes the day the server adds a version.

##### Oldest — Rejected

A server that adds an older version for compatibility moves its existing clients backward.

##### Version required — Rejected

Breaks every client that exists today.

#### Version error status

##### 400 or 406 by case — Selected

An unavailable version fits RFC 9110's definition of 406, which is based on the negotiation header fields in the request. 400 covers malformed or conflicting requests. OpenStack splits them the same way. On writes, 406 describes the response even though the version also governs the request body, and `code` carries the distinction either way.

##### One status for every version error — Rejected

Generic monitoring can't separate a broken request from an unavailable version.

##### 400/406 plus 410 for retired versions — Rejected

GitHub returns 410 for retired versions, but with a header carrier, 410 says the URL is gone, which is false when only one version is retired. It can also be cached by default, and it adds a third status for clients.

### Retiring a version

#### Retiring a default

##### Move forward — Selected

Clients that send no version are never forced to start sending one. When serving many versions is the norm, retiring a default is rare and announced well in advance. The cost: before 1.0, a client that ignored the notice can get changed fields in a successful response. GitHub moves its default forward the same way.

##### Reject requests without a version — Rejected

A loud, easy-to-diagnose failure, but every client that sends no version must change, even when the next version is compatible.

##### Move only to a compatible version, otherwise reject — Rejected

Before 1.0 a minor version may break compatibility, so this behaves like rejecting while adding a way to declare compatibility.

#### Announcing a default change

##### `successor-version` link — Selected

A server can move clients that send no version forward without dropping a version other clients still request, which keeps serving many versions cheap. `Deprecation` and `Sunset` keep their standard meaning, so a client, proxy, or monitoring tool that sees them can trust they describe the version being served. Clients that request the old version explicitly see nothing, because nothing changes for them. The relation is IANA-registered, so generic tooling can recognize it. The cost is that the header alone says only that a successor exists, not that the default is moving or when. The date lives in discovery.

##### A CommonGrants link relation — Rejected

Would say "the default is changing" precisely. But a relation that isn't registered has to be a URI the protocol controls, and no generic tooling recognizes it.

##### Deprecation and Sunset redefined on responses served by default — Rejected

Reuses headers that existing tooling already watches. But their standard meaning is that the resource itself is being deprecated or will stop responding, and the Sunset RFC says it isn't meant for a version that's no longer preferred but still operational. Tooling that doesn't know the redefinition reports a deprecated endpoint.

##### Only by retiring the old default — Rejected

Keeps the headers' standard meaning with no new relation, but a server that wants a newer default has to drop the old version to get it, which works against serving many versions.

#### Removing a version from one route

##### Same process as the whole server — Selected

Clients using that route get the same warning they would for a server-wide retirement, and there is one lifecycle for servers and tooling to implement. It adds no cost to serving a version, only notice before dropping one. Experimental routes are exempt, matching their existing status ([ADR 0019](https://commongrants.org/governance/adr/0019-api-route-status/)).

##### No notice required — Rejected

Less work for the server, but clients of that route break without warning, and clients that send no version can have that route's default switched silently.

### Existing patterns

| Question                    | GitHub                                                           | Stripe                                                 | Kubernetes                                             | This decision                                                                      |
| --------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Selecting a version         | `X-GitHub-Api-Version` request header, with a release date       | `Stripe-Version` request header, with a dated release  | A path segment per API group, such as `/apis/batch/v1` | `CG-Version` request header                                                        |
| No version sent             | A fixed default                                                  | The account's default, kept until the account upgrades | Doesn't arise: every path names its version            | A pinned default per server                                                        |
| Served version on responses | `X-GitHub-Api-Version-Selected` header                           | Not documented                                         | `apiVersion` field in every object                     | `CG-Version-Served` header                                                         |
| Supported versions          | `GET /versions`                                                  | The changelog                                          | `/api` and `/apis` list each group's versions          | `GET /common-grants/versions`                                                      |
| Deprecation signal          | `Deprecation` and `Sunset` headers                               | Not documented                                         | `Warning` header                                       | `Deprecation`, `Sunset`, and `Link`, plus `successor-version` for a default change |
| After retirement            | 410 Gone; the default moves to the next oldest supported version | Not documented                                         | The version stops being served                         | `version.retired`, and the default moves forward                                   |
| Scope of a version          | The whole API                                                    | The whole account                                      | Each API group                                         | A baseline plus per-route entries                                                  |

Sources: [GitHub API versions](https://docs.github.com/en/rest/about-the-rest-api/api-versions), [GitHub versions endpoint](https://docs.github.com/en/rest/meta/meta#get-all-api-versions), [Stripe API versioning](https://docs.stripe.com/api-versions), [Kubernetes API versioning](https://kubernetes.io/docs/reference/using-api/), [Kubernetes deprecation policy](https://kubernetes.io/docs/reference/using-api/deprecation-policy/).

### Protocol conformance

| Aspect           | Convention                                                                                                         | Conforms / Diverges                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route prefix     | Protocol routes under `/common-grants/`                                                                            | Conforms: `/common-grants/versions`. No version segment is added to any path                                                                                                      |
| Route status     | Tags required, optional, experimental ([ADR 0019](https://commongrants.org/governance/adr/0019-api-route-status/)) | Diverges (scoped exception): discovery is tagged optional, and the requirement for multi-version servers lives in the specification text, because a tag can't state a condition   |
| Identifiers      | `{resource}Id` path parameters; versions as `0.5.0` strings                                                        | Conforms: route keys reuse the protocol's path templates, and versions use the existing format                                                                                    |
| Success shape    | Success envelope with the payload under `data`                                                                     | Conforms                                                                                                                                                                          |
| Error shape      | Error envelope `{status, message, errors}`                                                                         | Conforms: version details are entries in `errors`                                                                                                                                 |
| Field names      | camelCase                                                                                                          | Conforms. Map keys (version strings and route keys) are values, not field names                                                                                                   |
| Headers          | `Location` on accepted responses                                                                                   | New pattern: `CG-Version` and `CG-Version-Served` are the first protocol-defined custom headers. Uses the IETF `Deprecation`, `Sunset`, and `Link` headers instead of custom ones |
| Status codes     | Operations declare 401, 403, and 404                                                                               | New: 400 and 406 for version errors. 406 is new to the protocol                                                                                                                   |
| Query parameters | camelCase, such as `pageSize`                                                                                      | Not applicable: no query parameter is added                                                                                                                                       |
| Versioning       | `@added` on new fields and routes                                                                                  | Conforms: the headers, errors, and discovery route are added in 0.6.0                                                                                                             |
| Custom routes    | Outside `/common-grants/` ([ADR 0014](https://commongrants.org/governance/adr/0014-custom-routes/))                | Conforms: the header has no meaning on custom routes                                                                                                                              |
| Pagination       | Page-based ([ADR 0011](https://commongrants.org/governance/adr/0011-pagination/))                                  | Not applicable: discovery isn't paginated                                                                                                                                         |
| Mock API         | Versioned by path ([ADR 0028](https://commongrants.org/governance/adr/0028-mock-api-hosting/))                     | Diverges: this decision supersedes ADR 0028's path prefix, and the mock moves to the header                                                                                       |

## Specification

### Scenarios

These scenarios show the decision end to end. The sections that follow answer the client and implementer questions for each area.

| Scenario                                 | Request                                                            | Result                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Request a served version                 | `CG-Version: 0.5.0`                                                | 200 in 0.5.0. `CG-Version-Served` reports the version, which can differ in the patch number only |
| No version sent                          | No header                                                          | 200 in the server's pinned default. `CG-Version-Served` names it                                 |
| Version the server doesn't serve         | `CG-Version: 0.3.0`                                                | 406 `version.unsupported`, scope `deployment`, with the supported versions and the discovery URL |
| Version this route doesn't serve         | `CG-Version: 0.4.0` on a route that serves only 0.5.0              | 406 `version.unsupported`, scope `operation`. The route's entry in discovery predicts this       |
| Server that serves only one version      | `CG-Version: 0.5.0` to a server that serves only 0.6.0             | 406 `version.unsupported`, scope `deployment`. The server doesn't substitute 0.6.0               |
| Malformed or repeated value              | `CG-Version: banana`, or the header sent twice                     | 400 `version.malformed` or `version.conflict`                                                    |
| Version in the URL instead of the header | `?cg-version=0.5.0` with no header                                 | 200 in the default. The URL isn't a selector, and `CG-Version-Served` shows what the client got  |
| Body validated in the requested version  | A 0.4.0 search with a filter that exists only in 0.5.0             | 400 validation error naming the filter, with `CG-Version-Served: 0.4.0`                          |
| Server that predates negotiation         | `CG-Version: 0.5.0` to a server that ignores the header            | 200 with no `CG-Version-Served`. The response is unconfirmed and must not be read as 0.5.0       |
| Host API with its own path versioning    | `GET /api/v2/common-grants/opportunities` with `CG-Version: 0.5.0` | 200 in 0.5.0. The host's v2 and the protocol version are independent                             |
| Custom route                             | `CG-Version: 0.5.0` on a route outside `/common-grants/`           | The header is ignored. No `CG-Version-Served` and no version errors                              |
| Shared cache in front of the API         | Two clients request 0.4.0 and 0.5.0 for the same URL               | Each gets its own version, because `Vary: CG-Version` keeps the cached responses apart           |
| Default is changing                      | No header, while the default moves from 0.4.0 to 0.5.0             | 200 in 0.4.0 with the `successor-version` link, and no `Deprecation` or `Sunset`                 |
| Version is retiring                      | `CG-Version: 0.3.0` before its sunset date                         | 200 in 0.3.0 with `Deprecation`, `Sunset`, and `Link` headers                                    |
| Version has been retired                 | `CG-Version: 0.3.0` after its sunset date                          | 406 `version.retired` with the sunset date, the supported versions, and the discovery URL        |

### Discovering supported versions

#### Clients

##### How do I find out which versions a server supports?

Call `GET /common-grants/versions`, relative to the API's base URL. You don't need to send `CG-Version`, and the route never returns a version error. Here's a server whose baseline is 0.4.0, which also serves form detail in 0.5.0 and serves its form list only in 0.5.0:

```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "versions": ["0.4.0"],
    "defaultVersion": "0.4.0",
    "operations": {
      "GET /common-grants/forms": {
        "versions": ["0.5.0"],
        "defaultVersion": "0.5.0"
      },
      "GET /common-grants/forms/{formId}": {
        "versions": ["0.4.0", "0.5.0"],
        "defaultVersion": "0.4.0"
      }
    }
  }
}
```

Version values are strings in the `0.5.0` format, not a closed list, so accept versions published after your client was built. Ignore fields you don't recognize.

If discovery returns 404, treat the server as serving one version it doesn't advertise. If responses also lack `CG-Version-Served`, that version is unknown and every response is unconfirmed.

##### Does every route support the same versions?

Not always. `versions` and `defaultVersion` are the baseline. A route listed under `operations` uses its own entry instead. A route is identified by its HTTP method and its path as published in the protocol. Path parameter names are ignored when matching, so `{id}` and `{formId}` in the same position identify the same route.

#### Implementers

##### When must I publish discovery?

The route is optional. A server that serves more than one version MUST implement it. It requires no stronger authentication than the API's required routes, and SHOULD be readable without authentication. It ignores `CG-Version`, and its responses carry neither `CG-Version-Served` nor `Vary: CG-Version`. A server whose routes all serve the baseline omits `operations`.

##### What does listing a version promise?

- A route can serve a version only if that version of the protocol defines the route.
- Every route a baseline version requires serves that version, so the baseline is a compliance claim: the server is compliant with every version in it.
- Supporting a version doesn't mean implementing that version's optional or experimental routes.
- A default is always one of the versions it applies to.
- One request is served in one version. The whole response follows that version's schemas, including nested objects. How a server represents data that an older version can't express is outside this decision.
- Only protocol routes under `/common-grants/` are covered. A plugin's package version is never a CommonGrants version ([ADR 0022](https://commongrants.org/governance/adr/0022-plugin-framework/)).

##### What goes in discovery while a change is pending?

Optional lifecycle fields, included only while a change is pending: at the top level for the baseline, or in a route's entry for that route only. Dates use RFC 3339. Here's the `data` payload of a server moving its default to 0.5.0 and retiring 0.3.0:

```json
{
  "versions": ["0.3.0", "0.4.0", "0.5.0"],
  "defaultVersion": "0.4.0",
  "upcomingDefault": {
    "version": "0.5.0",
    "date": "2027-03-01T00:00:00Z"
  },
  "deprecated": {
    "0.3.0": {
      "deprecation": "2026-12-01T00:00:00Z",
      "sunset": "2027-06-01T00:00:00Z"
    }
  }
}
```

Fields are only ever added.

### Requesting a specific version

#### Clients

##### How do I ask for a version?

Send the full version in the `CG-Version` request header:

```http
GET /common-grants/opportunities/123 HTTP/1.1
CG-Version: 0.5.0

HTTP/1.1 200 OK
CG-Version-Served: 0.5.1
Vary: CG-Version
```

Send one value per request. The value is three dot-separated numbers with no leading zeros. A `v` prefix, a short form such as `0.5`, ranges, and aliases are malformed. The header only means something on routes under `/common-grants/`. A version in the path or query string is never read as a selector.

##### What happens if I don't ask?

You're served in the server's default: the baseline default, or the route's own default when the route has an entry. The default doesn't change when the server adds versions. It changes only after an announced default change (see [Retiring a version](#retiring-a-version-2)). If you need a fixed contract, send a version.

##### How do I know which version I got?

Read `CG-Version-Served`. It reports the full version served, so it can differ from your request in the patch number only.

- A successful response without it is unconfirmed: the server may predate negotiation, or something in between dropped your header. Don't read it as the version you asked for.
- A served version whose major or minor number differs from the one you asked for wasn't served as requested. Don't treat it as your version.

##### What errors can I get, and how do I recover?

| Case                                                   | `code`                                               | Status |
| ------------------------------------------------------ | ---------------------------------------------------- | ------ |
| Malformed version, such as `banana` or `0.5`           | `version.malformed`                                  | 400    |
| Version this server doesn't serve                      | `version.unsupported`, scope `deployment`            | 406    |
| Version this route doesn't serve                       | `version.unsupported`, scope `operation`             | 406    |
| Version retired from this server or this route         | `version.retired`, scope `deployment` or `operation` | 406    |
| More than one version value, even the same value twice | `version.conflict`                                   | 400    |

Details are entries in the existing error envelope. `supported` and `defaultVersion` always describe the route you called, so retry with a listed version:

```json
{
  "status": 406,
  "message": "The requested CommonGrants version is not available for this route",
  "errors": [
    {
      "field": "CG-Version",
      "code": "version.unsupported",
      "message": "Version 0.4.0 is not served by GET /common-grants/forms. Supported versions: 0.5.0",
      "requested": "0.4.0",
      "supported": ["0.5.0"],
      "scope": "operation",
      "defaultVersion": "0.5.0",
      "discovery": "https://grants.example.org/common-grants/versions"
    }
  ]
}
```

`version.retired` also carries `sunset`, in RFC 3339. `version.conflict` omits `requested`, and its message names the values received. `code` values are stable; branch on them.

#### Implementers

##### How do I resolve the requested version?

- Read `CG-Version` only on protocol routes under `/common-grants/`, never on custom routes or discovery. The name is case-insensitive. Trim surrounding whitespace, then match the format exactly.
- Match on major and minor. Host one patch of each major and minor you serve, and report that full version everywhere you list or report it. A request for any patch of a served major and minor is served in the version you host.
- Never serve a different major or minor version than the one requested, even if you serve only one version.
- Never read the version from the URL path, the query string, `Accept`, or a vendor media type, and never fall back to one. A host API that versions its own routes by path keeps doing so; its path version and `CG-Version` are independent.
- A protocol patch never changes schemas, validation, required routes, or status codes. A fix that changes any of these is published as a new minor or major version.

##### Which errors do I return, and in what order do I check?

Match the route, then resolve the version, then validate the request body against that version's schemas, all before any side effect. A route you don't implement gets an ordinary 404. Where authentication runs is up to you. A rejected write changes nothing, and is never retried under another version.

A version problem never returns 404 or 410: both can be cached by default, and clients read them as a missing route or record. How long you answer `version.retired` rather than `version.unsupported` after a sunset is up to you, since both carry the supported versions.

##### Which headers must my responses carry?

- `CG-Version-Served` on every response produced after a version is selected, including responses served by default and errors such as a missing record or a body validation error. It's optional on 401 and 403, because authentication can run before selection. Version errors never carry it.
- `Vary: CG-Version` on every cacheable response that depends on `CG-Version`, including responses served by default.
- Cross-origin servers allow `CG-Version` in `Access-Control-Allow-Headers`, and expose `CG-Version-Served`, `Deprecation`, `Sunset`, and `Link` in `Access-Control-Expose-Headers`.
- No supported-versions header on ordinary responses.
- Header names use hyphens and no `X-` prefix.

### Retiring a version

#### Clients

##### How will I hear that a version is retiring?

Responses served in that version carry `Deprecation`, then `Sunset` once a date is set, with `Link` headers to migration documentation and to discovery. These headers always describe the version you were served, and discovery lists the version under `deprecated` with its dates:

```http
GET /common-grants/opportunities/123 HTTP/1.1
CG-Version: 0.3.0

HTTP/1.1 200 OK
CG-Version-Served: 0.3.0
Deprecation: @1796083200
Sunset: Tue, 01 Jun 2027 00:00:00 GMT
Link: <https://grants.example.org/docs/migrate>; rel="deprecation"
Link: <https://grants.example.org/docs/migrate>; rel="sunset"
Link: <https://grants.example.org/common-grants/versions>; rel="version-history"
```

`Deprecation` uses the `@<unix-timestamp>` form from RFC 9745, `Sunset` uses HTTP-date, and discovery uses RFC 3339.

##### How will I hear that the default is changing?

If you send no version, responses from routes whose default is changing carry a `successor-version` link, and discovery shows `upcomingDefault` with the date. They carry no `Deprecation` or `Sunset` unless the version itself is retiring. If you send a version, nothing changes for you.

```http
GET /common-grants/opportunities/123 HTTP/1.1

HTTP/1.1 200 OK
CG-Version-Served: 0.4.0
Vary: CG-Version
Link: <https://grants.example.org/docs/versions/0.5.0>; rel="successor-version"
Link: <https://grants.example.org/common-grants/versions>; rel="version-history"
```

##### What happens after a version is retired?

Requests for any patch of that major and minor get 406 `version.retired`, with the sunset date and the supported versions. If it was your default, the default has already moved to the next newer version.

#### Implementers

##### How do I change my default?

You can change a default whether or not you keep serving the old one. Announce it first:

- On responses served by default from the affected routes, send `Link` with `rel="successor-version"` pointing to documentation for the new default, and `Link` with `rel="version-history"` pointing to discovery.
- Show `upcomingDefault` with the date in discovery: at the top level for the baseline default, which also covers route entries whose default follows the baseline, or in a route's entry for that route's own default.
- Don't send `Deprecation` or `Sunset` for a default change.

At the announced date, the default moves to the next newer version it applies to.

##### How do I retire a version, server-wide or for one route?

The same way in both cases:

- Send `Deprecation`, and `Sunset` once a date is set, with `Link` headers to migration documentation (`rel="deprecation"` and `rel="sunset"`) and to discovery (`rel="version-history"`), on every response served in that version on the affected routes.
- List the version under `deprecated` in discovery: at the top level when it's leaving the whole server, or in the route's entry when it's leaving one route.
- After the sunset, answer requests for it with `version.retired`.
- If the version is a default, move that default forward no later than the sunset, announcing it as above. Responses served by default then carry both the retirement headers and the `successor-version` link. You can't retire a default unless you serve a newer version for it to move to.
- A required route can't drop a baseline version that requires it, so retiring that version from the route means retiring it from the baseline.
- Experimental routes may drop a version without notice.
