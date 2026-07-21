---
title: Organization profile syncing
description: ADR defining an API contract that enables syncing organization profile data across systems.
tableOfContents:
  maxHeadingLevel: 3
---

Organizations often manage profiles across multiple grant systems, like Grants.gov, Candid, Temelio, and Fluxx. But today, when information about an organization changes (e.g. website or address), they need to make the same update to their profile in each system. CommonGrants would like to provide a standardized mechanism synchronizing these changes across systems automatically.

[ADR-0023](/governance/adr/0023-org-ids/) introduced a pattern for matching organizations across platforms using their `identifiers` collection, and this ADR builds on this pattern by defining the standard API contract for making and reviewing changes to a given organization's profile once it's been matched to a record in another system.

The proposed contract remains intentionally agnostic about the architectural pattern used to synchronize changes across systems (pub-sub, webhooks, batch processing, etc.) with the goal of supporting multiple patterns concurrently. Instead, it focuses on defining things like: How can API clients view and make changes to a given organization's profile? And how do we confirm they have the necessary permissions to do so?

## Decision

:::note[At a glance]
Here is a brief summary of the API contract this ADR proposes:

- An API client uses a JWT, issued via OAuth 2.0, that includes a set of signed claims proving it's authorized to view and make changes to a given organization. A client that manages several organizations uses a separate token for each.
- API clients can view and manage organization profile data using the following endpoints:
  - List all orgs: `GET /common-grants/orgs/`
  - View an org profile: `GET /common-grants/orgs/{orgId}`
  - Update an org profile: `PATCH /common-grants/orgs/{orgId}`
  - Propose an org profile change: `POST /common-grants/orgs/{orgId}/changes`
  - View an org's profile changes: `GET /common-grants/orgs/{orgId}/changes`
- API servers can choose to either support `PATCH` operations where changes are accepted immediately, `POST /changes` operations where changes are staged for review, or support both but limit clients to specific operations by scope (e.g. trusted clients can `PATCH` or `POST`, but external systems can only `POST`)

:::

### Questions

- **[Authentication](#authentication)** Which OAuth grant flows does the API contract support? Client credentials flow for machine-to-machine workflows or authorization code flow with PKCE for delegated access based on the consent of an org admin.
- **[Token format](#token-format)** Should access tokens be stateless JWTs that contain signed authorization claims, or arbitrary strings that need to be validated through a separate API call?
- **[Permissions](#permissions)** How are scopes formatted, and how is a token restricted to the organization it may act on?
- **[Updating a profile](#updating-a-profile)** Do API clients update a profile with a direct `PATCH`, a submitted change via `POST /changes`, or both?
- **[Partial-update format](#partial-update-format)** Does the payload for partial updates use JSON Merge Patch, JSON Patch, field masks, or a combination?
- **[Viewing historical changes](#viewing-historical-changes)** Are historical changes to a profile presented as a change log, list of revisions, or point-in-time query?
- **[Acceptance](#acceptance)** Are changes applied immediately, queued for review, or both, depending on the write path?
- **[Provenance](#provenance)** How much actor identity is recorded, and how is PII kept out of shared payloads?

### Decision summary

- **Authentication:** Support both OAuth 2.0 flows. Use Client Credentials for service-to-service operations, and Authorization Code with PKCE when an org admin needs to grant access on a user's behalf.
- **Token format:** Access tokens are self-contained JWTs (RFC 7519), so a receiver can validate one against the issuer's JWKS without a separate lookup. The required claims are `iss sub aud iat exp scope`, and `grant_type` and a namespaced `org_id` are recommended.
- **Permissions:** Scopes identify the operations permitted on a resource (e.g. `org:read` and `org:write`) and by default apply to all organizations a `sub` can access. Tokens that include a namespaced `org_id` claim are restricted to that org, and granting different levels of access to multiple organizations requires a separate token per org.
- **Updating a profile:** Support a direct `PATCH /orgs/{orgId}` and a `POST /orgs/{orgId}/changes` submission, both of which append to the same change ledger. A `PATCH` requires `org:write`, is accepted immediately, and is intended for changes from trusted clients. A `POST /changes` requires `org.changes:write`, submits a change that can be accepted or rejected, and is intended for changes from external systems. An adopter can support one or both operations and grant access to them independently.
- **Partial-update format:** Use JSON Merge Patch (RFC 7396): include a field to set it, leave it out to keep it unchanged, or send `null` to clear its value.
- **Viewing historical changes:** Offer an optional `GET /orgs/{orgId}/changes` that returns a list of changes, each optionally including both its Merge Patch payload and a full snapshot with the change applied, plus an optional `?at=` parameter on the `GET /orgs/{orgId}` for a point-in-time snapshot.
- **Acceptance:** Both operations return a change with a `status`. A `PATCH` is always `accepted` immediately, and its `snapshot` is the updated record; a `POST /changes` may be `accepted`, `denied`, `pending`, or `superseded`. Both are listed by the `GET /orgs/{orgId}/changes` endpoint.
- **Provenance:** The system records who made a change from the token itself, never from a field in the request body, along with the source system, and keeps human-identifying PII out of shared payloads.

### Consequences

- **Positive consequences**
  - **Authentication:** Follows established standards like OAuth 2.0 and JWT, allowing adopters to reuse their existing AuthN/Z infrastructure in many cases.
  - **Token format:** A receiver can authorize a request directly from the signed token, without calling back to the issuer each time.
  - **Permissions:** Operation-only scopes keep the vocabulary limited and match how Auth0 and GitHub scope a token; a token can name one org or omit `org_id` to cover every org the subject can access, so it never has to enumerate a list.
  - **Updating a profile:** Adopters can support the operation(s) that fit their trust model, a direct `PATCH` for trusted in-system edits or a queued `POST /changes` for external proposals, and both changes are written to a single ledger.
  - **Partial-update format:** A Merge Patch body closely reflects the shape of the organization record clients are trying to update, which makes it intuitive to use, and it is a widely used update format.
  - **Viewing historical changes:** Full snapshots make it easy to fetch a record at a known version, and they still work if a deployment squashes intermediate versions.
  - **Provenance:** Anchoring provenance to the token's signed claims means a sender can't forge who made a change.
- **Negative consequences**
  - **Authentication:** Two flows require more building, testing, and documentation than one, and delegated flows ask senders to store and rotate refresh tokens server-side.
  - **Token format:** Systems can't immediately revoke a token, since a JWT stays valid until it expires, though short lifetimes and key rotation can reduce that risk.
  - **Permissions:** A client that wants to sync multiple orgs with distinct permissions needs a separate token for each.
  - **Updating a profile:** Supporting two types of write operations could add complexity for change resolution, especially if the same record receives both `POST /changes` and `PATCH` requests in close succession.
  - **Partial-update format:** Merge Patch can't target a single array element, and it overloads `null` to mean "clear this field." which adds complexity if systems implement different subsets of optional and custom fields.
  - **Viewing historical changes:** Full snapshots cost more to store (or compute) than a field-level change log, especially for records that change often.
  - **Provenance:** Using JWT claims to determine provenance doesn't let clients record changes on behalf of other requestors.

### Decision drivers

- **Follow existing standards and practices where they fit.** Grounds the use of OAuth 2.0 and JWTs for auth, JSON Merge Patch (RFC 7396) for updates, and an operation-scope vocabulary modeled on common providers, so adopters reuse infrastructure and conventions they already run.
- **Balance flexibility with standardization.** Preserve optionality where several approaches coexist without conflict (either OAuth flow, a direct `PATCH` or a submitted `POST /changes` over one ledger, immediate or queued acceptance), but standardize on one where supporting several would produce conflicting or duplicate results (binding a token to an org through one `org_id` claim rather than also encoding it in the scope string, JSON Merge Patch rather than several competing patch formats).
- **Pattern alignment.** Follow existing CommonGrants conventions: identifier matching ([ADR-0023](/governance/adr/0023-org-ids/)), pagination ([ADR-0011](/governance/adr/0011-pagination/)), and route-status tags ([ADR-0019](/governance/adr/0019-api-route-status/)).
- **Balance usability with security.** Favor the option that is easiest to adopt unless it weakens security: self-contained JWTs over an introspection round trip, and a token-anchored provenance trail that records who changed what without leaking PII into shared payloads.

### Operations with example payloads

Every endpoint sits under `/common-grants/orgs`, and the path-based `{orgId}` refers to the organization's system-specific UUID (`Organization.id`). A client that only knows an external identifier, like an EIN, UEI, or platform ID, can look up the UUID via a filter query param on `GET /orgs` (see [ADR-0023](/governance/adr/0023-org-ids/)). The org record follows [`OrganizationBase`](/protocol/models/organization). Server-assigned fields like `datasetVersion` appear in response bodies but are ignored in request bodies, and since field-level schemas still need to be finalized in the follow-up spec, the payloads below are just illustrative.

Successful responses use the standard CommonGrants envelope: `Responses.Ok<T>` wraps a single resource as `{ status, message, data }` and `Responses.Paginated<T>` wraps a list as `{ status, message, items, pagination }`, where the envelope's `status` is the HTTP status code. The read and list examples below show only the `data`/`items` payload; the write examples show the full envelope, since a write returns a change whose own lifecycle `status` (`accepted`, `pending`, and so on) sits inside `data`.

**Required endpoints**

| Verb | Path            | Purpose              | Scope      |
| ---- | --------------- | -------------------- | ---------- |
| GET  | `/orgs`         | List orgs            | `org:read` |
| GET  | `/orgs/{orgId}` | Read one org by UUID | `org:read` |

**Write endpoints (a deployment SHOULD support at least one)**

| Verb  | Path                    | Purpose                                     | Scope               |
| ----- | ----------------------- | ------------------------------------------- | ------------------- |
| PATCH | `/orgs/{orgId}`         | Direct edit, applied now (JSON Merge Patch) | `org:write`         |
| POST  | `/orgs/{orgId}/changes` | Submit a change (may be queued for review)  | `org.changes:write` |

**Optional endpoints**

| Verb | Path                    | Purpose                         | Scope              |
| ---- | ----------------------- | ------------------------------- | ------------------ |
| GET  | `/orgs/{orgId}/changes` | List changes (patch + snapshot) | `org.changes:read` |

<details>
<summary>List orgs: `GET /orgs`</summary>

Required scope: `org:read`. By default this returns every organization the caller can view, which is likely the full set for a public directory. Results are paginated per [ADR-0011](/governance/adr/0011-pagination/), and each item is an organization record, including its identifier collection. To look up an org by an external identifier, filter with `registry` and `id`, like `?registry=us:ein&id=123456789` (see [ADR-0023](/governance/adr/0023-org-ids/)).

Request:

```
GET /common-grants/orgs?page=1&pageSize=50
Authorization: Bearer <jwt>
```

Response:

```json
{
  "items": [
    {
      "id": "01912a8b-7c3d-7890-abcd-ef1234567890",
      "name": "Example Nonprofit",
      "datasetVersion": 7,
      "identifiers": {
        "us:ein": { "id": "123456789" },
        "us:uei": { "id": "AB0123456789" }
      }
    }
  ],
  "pagination": { "page": 1, "pageSize": 50, "totalItems": 1 }
}
```

</details>

<details>
<summary>Read one org: `GET /orgs/{orgId}`</summary>

Required scope: `org:read`, where `{orgId}` is the organization's system-specific UUID (`Organization.id`). The response is the org record at its latest version, or at a specific version if requested; the optional `?at=` read pattern is covered under [changes](#viewing-historical-changes).

Request:

```
GET /common-grants/orgs/01912a8b-7c3d-7890-abcd-ef1234567890
Authorization: Bearer <jwt>
```

Response:

```json
{
  "id": "01912a8b-7c3d-7890-abcd-ef1234567890",
  "name": "Example Nonprofit",
  "identifiers": {
    "systemId": {
      "registry": {
        "code": "grants.gov:org",
        "url": "/registries/grants-gov-org",
        "scope": "grants.gov",
        "kind": "platform"
      },
      "id": "01912a8b-7c3d-7890-abcd-ef1234567890"
    },
    "us:ein": {
      "registry": {
        "code": "us:ein",
        "url": "/registries/us-ein",
        "scope": "US",
        "kind": "government"
      },
      "id": "123456789"
    }
  },
  "orgType": {
    "term": "Hospital",
    "class": "Organization types",
    "code": "EO000000"
  },
  "addresses": {
    "primary": {
      "street1": "456 Main St",
      "city": "Anytown",
      "stateOrProvince": "CA",
      "country": "US",
      "postalCode": "12345"
    }
  },
  "phones": {
    "primary": {
      "countryCode": "+1",
      "number": "444-456-1230",
      "isMobile": true
    }
  },
  "emails": { "primary": "info@example.com" },
  "mission": "To provide support and resources to the community.",
  "yearFounded": "2024",
  "socials": { "website": "https://www.example.com" },
  "datasetVersion": 7
}
```

</details>

<details>
<summary>Update an org: `PATCH /orgs/{orgId}`</summary>

Required scope: `org:write`. The body is a JSON Merge Patch (RFC 7396): include a field to set it, leave it out to keep it unchanged, or send `null` to clear it. The receiver determines who made the change and which system it came from using the token and request context, not fields in the request body (see [provenance](#provenance)).

Request:

```
PATCH /common-grants/orgs/01912a8b-7c3d-7890-abcd-ef1234567890
Authorization: Bearer <jwt>
Content-Type: application/merge-patch+json
```

```json
{
  "name": "Example Nonprofit (Renamed)",
  "mission": "To expand access to community health resources.",
  "socials": { "website": null }
}
```

Response: `200 OK`. Like every write, the result is a change in the standard envelope. A `PATCH` is applied immediately, so its change is `accepted`, and `snapshot` is the full updated record at its new `datasetVersion`.

```json
{
  "status": 200,
  "message": "Change applied",
  "data": {
    "id": "01926d3f-8a2b-7c4e-9d01-23456789abcd",
    "status": { "value": "accepted" },
    "datasetVersion": 9,
    "patch": {
      "name": "Example Nonprofit (Renamed)",
      "mission": "To expand access to community health resources.",
      "socials": { "website": null }
    },
    "snapshot": {
      "id": "01912a8b-7c3d-7890-abcd-ef1234567890",
      "name": "Example Nonprofit (Renamed)",
      "mission": "To expand access to community health resources.",
      "socials": {},
      "datasetVersion": 9
    }
  }
}
```

To submit a change that may be reviewed before it takes effect, use [`POST /orgs/{orgId}/changes`](#acceptance) instead, which can return a `pending` change.

</details>

<details>
<summary>Submit a change: `POST /orgs/{orgId}/changes`</summary>

Required scope: `org.changes:write`. Creates a change from a JSON Merge Patch body. A receiver that applies it right away returns `accepted`; one that routes it through review returns `pending` with a `Location` header for the new change (see [acceptance semantics](#acceptance)). A direct `PATCH /orgs/{orgId}` covers the apply-now case, and both operations appear in `GET /orgs/{orgId}/changes`. The exact request envelope is left to the follow-up spec.

Request:

```
POST /common-grants/orgs/01912a8b-7c3d-7890-abcd-ef1234567890/changes
Authorization: Bearer <jwt>
Content-Type: application/merge-patch+json
```

```json
{
  "mission": "To expand access to community health resources.",
  "socials": { "website": null }
}
```

Response: `202 Accepted`, with the change in the standard envelope. A receiver that applies it right away returns an `accepted` change with a `snapshot`; one that routes it through review returns `pending`.

```
202 Accepted
Location: /common-grants/orgs/01912a8b-7c3d-7890-abcd-ef1234567890/changes/01926d3f-8a2b-7c4e-9d01-23456789abcd
```

```json
{
  "status": 202,
  "message": "Change accepted for review",
  "data": {
    "id": "01926d3f-8a2b-7c4e-9d01-23456789abcd",
    "status": { "value": "pending" },
    "patch": {
      "mission": "To expand access to community health resources.",
      "socials": { "website": null }
    }
  }
}
```

</details>

<details>
<summary>View changes: `GET /orgs/{orgId}/changes`</summary>

Required scope: `org.changes:read`. This endpoint is optional, and it returns a list of changes, newest first. Each entry can optionally include both the Merge Patch that was submitted and a full snapshot of the record with that change applied, so a consumer sees the delta and the resulting state without a second request. Each entry notes the source system it came from but not the person behind the change (see [provenance](#provenance)). The exact schema is left to the follow-up spec.

Request:

```
GET /common-grants/orgs/01912a8b-7c3d-7890-abcd-ef1234567890/changes
Authorization: Bearer <jwt>
```

Response:

```json
{
  "items": [
    {
      "id": "01926d3f-8a2b-7c4e-9d01-23456789abcd",
      "status": { "value": "accepted" },
      "datasetVersion": 9,
      "lastModifiedAt": "2026-06-20T14:30:00Z",
      "source": "grants.gov",
      "patch": {
        "name": "Example Nonprofit (Renamed)",
        "mission": "To expand access to community health resources."
      },
      "snapshot": {
        "id": "01912a8b-7c3d-7890-abcd-ef1234567890",
        "name": "Example Nonprofit (Renamed)",
        "mission": "To expand access to community health resources."
      }
    },
    {
      "id": "01925c1a-4b3d-7e8f-a012-3456789bcdef",
      "status": { "value": "accepted" },
      "datasetVersion": 7,
      "lastModifiedAt": "2026-03-15T09:00:00Z",
      "source": "candid",
      "snapshot": {
        "id": "01912a8b-7c3d-7890-abcd-ef1234567890",
        "name": "Example Nonprofit",
        "mission": "To provide support and resources to the community."
      }
    }
  ],
  "pagination": { "page": 1, "pageSize": 50, "totalItems": 2 }
}
```

</details>

### Scope vocabulary

Scopes only name operations. Which organization a token can act on comes from its `org_id` claim, not from the scope string. A token that omits `org_id` can exercise its scopes against every organization the subject can access, so `org:read` with no `org_id` reads all of them, as far as the receiver's own policy allows.

| Scope               | Description                                               |
| ------------------- | --------------------------------------------------------- |
| `org:read`          | Read organization profiles (list and view)                |
| `org:write`         | Apply a direct edit (`PATCH /orgs/{orgId}`)               |
| `org.changes:read`  | Read the changes feed (patches and snapshots)             |
| `org.changes:write` | Submit a change for review (`POST /orgs/{orgId}/changes`) |

### Required JWT claims

<details>
<summary>Example token payload and claim requirements</summary>

```json
{
  "iss": "https://auth.example.com",
  "sub": "svc_abc123",
  "aud": "https://sync.example.com",
  "iat": 1716000000,
  "exp": 1716003600,
  "scope": "org:read org:write",
  "grant_type": "client_credentials",
  "https://commongrants.org/org_id": "01912a8b-7c3d-7890-abcd-ef1234567890"
}
```

| Claim        | Required | Description                                                                                                                                                                                                                                                                                                                               |
| ------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `iss`        | MUST     | Issuer. Receivers MUST verify it matches a trusted authorization server.                                                                                                                                                                                                                                                                  |
| `sub`        | MUST     | Subject. The service account or user ID the token was issued to.                                                                                                                                                                                                                                                                          |
| `aud`        | MUST     | Audience. The receiving sync API's base URL. Receivers MUST reject tokens whose `aud` does not match theirs.                                                                                                                                                                                                                              |
| `iat`        | MUST     | Issued-at timestamp (Unix epoch).                                                                                                                                                                                                                                                                                                         |
| `exp`        | MUST     | Expiration timestamp. Receivers MUST reject expired tokens.                                                                                                                                                                                                                                                                               |
| `scope`      | MUST     | Space-separated list of granted operation scopes.                                                                                                                                                                                                                                                                                         |
| `grant_type` | SHOULD   | The grant flow used (`client_credentials` or `authorization_code`), so receivers can vary trust rules by flow.                                                                                                                                                                                                                            |
| `org_id`     | SHOULD   | The organization this token is limited to, as its `Organization.id` UUID, namespaced as a private claim (`https://commongrants.org/org_id`). Omit it for a token that should act on every org the subject can access (for example a listing or cross-org read token); the receiver then resolves the accessible orgs from its own policy. |

</details>

### Inbound trust decision

Before it accepts a change request, a receiving system runs these checks in order, and a failure at any step rejects the request. Steps 1-4 confirm the token is authentic and unexpired, steps 5-6 confirm it's allowed to perform this operation on this organization, and step 7 keeps a valid token from overriding the receiver's own access rules.

1. Validate the JWT signature against the issuer's JWKS; reject if invalid or unresolvable.
2. Verify `iss` is a known, trusted authorization server.
3. Verify `aud` matches the receiver's own base URL (stops a token for one system being replayed against another).
4. Check `exp`; reject expired tokens, allowing at most 60 seconds of clock skew.
5. Verify `scope` covers the operation: a direct `PATCH` needs `org:write`, a `POST /changes` submission needs `org.changes:write`, and a read needs `org:read`.
6. Check `org_id`. When the token includes an `org_id`, verify it matches the target org: a token bound to one `Organization.id` is rejected for a request against any other, even if its `scope` is write-capable. When the token omits `org_id`, it isn't limited to one org, so the receiver relies on the scope plus its local access policy (step 7) to decide which orgs the subject may touch.
7. Apply local access policy. A valid token does not override the receiver's rules; if `sub` cannot modify the target org locally, reject with `403 Forbidden`.

### Next steps

This ADR outlines the basic API contract, but the following details will need to be determined when this contract is added to the next version of the CommonGrants API spec:

- The exact request and response bodies for each of the proposed routes and operations.
- How HTTP statuses map to the change request status for `POST /changes` and `PATCH` operations.
- The content and shape of new schemas like a change record.
- Which filters can be supported as query params, and which should be reserved for a `POST /search` endpoint.
- How a client obtains a token a given receiver will accept, where each system issues its own tokens to registered clients.
- Whether to adopt a hardening profile like [FAPI](https://openid.net/wg/fapi/) on top of OAuth 2.0 and JWT.

A few things are also out of scope for this decision, mostly centered around the transport mechanisms for synchronizing changes across systems, as mentioned above:

- Outlining push and webhook transport options.
- Defining the pattern for registering or publishing to subscribers.
- Describing the full sync protocol two systems run when they first connect.

## Evaluation

### Authentication

_Which OAuth grant flows should the contract support?_

#### Side-by-side comparison

- ✅ Criterion met
- ❌ Criterion not met
- 🟡 Partially met or unsure

| Criteria                                       | Both (rec.) | Client credentials only | Auth code + PKCE only |
| ---------------------------------------------- | :---------: | :---------------------: | :-------------------: |
| Supports unattended machine-to-machine sync    |     ✅      |           ✅            |          ❌           |
| Supports human-consented delegated access      |     ✅      |           ❌            |          ✅           |
| Reuses standard OAuth 2.0 infrastructure       |     ✅      |           ✅            |          ✅           |
| Minimal number of flows to implement           |     ❌      |           ✅            |          ✅           |
| Fits a platform syncing on behalf of many orgs |     ✅      |           ❌            |          ✅           |

#### Option 1: Support both flows (recommended)

:::note[Bottom line]
Supporting both flows is the best fit if we

- want to cover both unattended service sync and access a human has consented to,
- but are willing to build and document two flows instead of one.
  :::

Use [Client Credentials](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4) when a backend service syncs on its own. The service authenticates as itself and reruns the flow when its token expires, with no refresh token:

```
POST /oauth/token
grant_type=client_credentials
&client_id=svc_abc123
&client_secret=...
&scope=org:read org:write
```

Use [Authorization Code with PKCE](https://datatracker.ietf.org/doc/html/rfc7636) when an org admin has to consent, or when a platform syncs on an org's behalf. PKCE ties the authorization code to the client that requested it, so a stolen code is useless to anyone else, and it's required for public clients like a browser, CLI, or mobile app:

```
GET /authorize?response_type=code
&client_id=platform_xyz
&scope=org:read org:write
&code_challenge=<derived-from-verifier>
&code_challenge_method=S256
```

In this flow the token represents a one-time human consent, so the refresh token becomes the lasting record of that consent and lets a platform keep syncing without re-prompting. Senders MUST keep refresh tokens server-side and MUST NOT let them reach a browser or other client-side environment.

- **Pros**
  - Covers both the machine-to-machine and human-in-the-loop cases without a custom scheme.
  - Lets a platform sync many orgs under delegated consent while a service syncs its own data directly.
  - Both flows are standard OAuth 2.0, so existing identity providers and SDKs work out of the box.
- **Cons**
  - Two flows are more to build, test, and document than one.
  - Delegated flows put refresh-token storage and rotation on senders.

#### Option 2: Client credentials only

:::note[Bottom line]
Client Credentials alone works if we

- only ever need service-to-service sync,
- but are willing to give up representing an org admin's consent, which rules out syncing on an org's behalf.
  :::

- **Pros**
  - A single, simple flow with no consent screens or refresh tokens.
- **Cons**
  - No way to capture an org admin's consent.
  - A platform syncing for many orgs would have to model each as its own service credential, losing the delegated-consent trail.

#### Option 3: Authorization code + PKCE only

:::note[Bottom line]
Authorization Code with PKCE alone works if we

- want every sync to start with a human's consent,
- but are willing to force an awkward consent step onto automated service sync.
  :::

- **Pros**
  - Strong protection for human-initiated flows.
- **Cons**
  - Awkward for unattended sync, where there's no human to consent and no browser to redirect.

### Token format

_Are access tokens self-contained JWTs, or opaque strings a receiver has to look up?_

#### Side-by-side comparison

| Criteria                                             | JWT (rec.) | Opaque + introspection |
| ---------------------------------------------------- | :--------: | :--------------------: |
| Validates without a per-request callback             |     ✅     |           ❌           |
| Reuses the standard SDK and library ecosystem        |     ✅     |           🟡           |
| Immediate revocation                                 |     ❌     |           ✅           |
| Small, opaque token string                           |     ❌     |           ✅           |
| Claims (`scope`, `org_id`) readable without a lookup |     ✅     |           ❌           |

#### Option 1: Self-contained JWT (recommended)

:::note[Bottom line]
A self-contained JWT is the best fit if we

- want a receiver to validate and authorize a request without calling back to the issuer,
- but are willing to accept that revocation isn't immediate and relies on short token lifetimes.
  :::

Access tokens are JWTs ([RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)). A receiver checks the signature against the issuer's JWKS and reads `scope` and `org_id` straight from the token (the payload shown under [Required JWT claims](#required-jwt-claims)) to make its decision, with no extra round trip. Short lifetimes keep the revocation window small:

- access tokens live 15 to 60 minutes,
- refresh tokens live up to a year and rotate on each use,
- authorization codes are good for 60 seconds and a single use.

- **Pros**
  - A receiver authorizes from the token alone.
  - Broad library support across languages and frameworks.
  - The scopes and org binding are right there in the token for the trust checks.
- **Cons**
  - A token stays valid until it expires, so revocation isn't immediate; short lifetimes keep the window small.
  - Receivers have to fetch and cache the issuer's keys and handle rotation.

#### Option 2: Opaque token plus introspection

:::note[Bottom line]
An opaque token works if we

- absolutely need the ability to revoke a token immediately,
- but are willing to add an extra verification call to every request.
  :::

The token is a random string with no readable claims, so a receiver validates it by calling the issuer's introspection endpoint ([RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662)) on each request:

```
POST /introspect
token=a1b2c3d4e5f6g7h8

→ { "active": true, "sub": "svc_abc123", "scope": "org:read org:write", "exp": 1716003600 }
```

- **Pros**
  - Revocation is immediate: the introspection endpoint can refuse a revoked token right away.
  - The token string contains no readable claims.
- **Cons**
  - Every request needs an introspection call (RFC 7662) unless it's cached, which adds latency and a dependency on the issuer being up.
  - Less well supported by the JWT-centric SDK ecosystem adopters already use.

### Permissions

_Is the organization a token can act on named per token, given as a list, or set per-org with its own access level?_

All three options keep the organization ID out of the scope string, which is what [GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens/managing-your-personal-access-tokens) and [Google](https://developers.google.com/identity/protocols/oauth2/scopes) both do: GitHub makes the org a property of the token rather than part of a scope, and Google's scopes are capability URLs with the resource resolved separately. Encoding the org in the scope (`org:write:{orgId}`) is the alternative we reject, since a token that touches many orgs would need a scope string per org, and the suffix just duplicates the org binding the token already provides through its `org_id` claim. The open question is how the token names the org (or orgs) it can act on.

#### Side-by-side comparison

- ✅ Criterion met
- ❌ Criterion not met
- 🟡 Partially met or unsure

| Criteria                                 | One token per org (rec.) | Multi-org, uniform | Multi-org, per-org levels |
| ---------------------------------------- | :----------------------: | :----------------: | :-----------------------: |
| Uses a standard or common claim          |            ✅            |         ❌         |            ✅             |
| Token size independent of org count      |            ✅            |         ❌         |            ❌             |
| One token can act on many orgs           |            ❌            |         ✅         |            ✅             |
| Supports different access levels per org |            ✅            |         ❌         |            ✅             |
| Simple for a receiver to enforce         |            ✅            |         ✅         |            🟡             |

#### Option 1: One token per organization (recommended)

:::note[Bottom line]
One token per org is the best fit if we

- want to follow the standard, widely understood models for restricting tokens to organizations,
- but are willing to require clients that sync several orgs to create a separate token for each org.
  :::

A token is bound to one organization through a namespaced `org_id` claim set to that org's `Organization.id` UUID:

```json
{
  "scope": "org:read org:write",
  "https://commongrants.org/org_id": "01912a8b-7c3d-7890-abcd-ef1234567890"
}
```

This mirrors how established providers scope a token to a tenant:

- [Auth0's Organizations](https://auth0.com/docs/manage-users/organizations) feature issues a token with a single `org_id` (plus `org_name`)
- [Microsoft Entra](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference) names a single tenant in `tid`
- [GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens/managing-your-personal-access-tokens) follows the same model, where a fine-grained token is limited to a single organization and the org is a property of the token rather than a scope string.

We decided to namespace the claim with `https://commongrants.org` following the [collision-safe convention that Auth0 requires for custom claims](https://auth0.com/docs/secure/tokens/json-web-tokens/create-custom-claims).

If a token omits the `org_id` claim, then its scopes apply to every organization the subject can access, based on the permissions that subject already has in the receiving API. This allows clients to do things like list and read multiple orgs without having to create several tokens, each with its own `org_id` claim. [Google](https://developers.google.com/identity/protocols/oauth2/scopes) follows a similar pattern, in which the token names only the supported operations and the resource server resolves the records against which a client can perform those operations.

- **Pros**
  - Matches a widely understood model (Auth0 `org_id`, Microsoft `tid`, GitHub per-org tokens).
  - The token stays small no matter how many orgs a client manages.
  - Keeps token scopes conceptually simple by applying a single set of permissions to either a single org or all orgs that a client can access.
- **Cons**
  - A client that syncs many orgs with different permissions needs a separate token for each.

#### Option 2: One multi-org token with uniform access

:::note[Bottom line]
A single token with an `org_ids` list works if we

- want one token to cover many orgs at once,
- but are willing to apply the same scopes to every org in the list and rely on a custom claim that lacks industry precedent.
  :::

A single token names several org IDs, with its scopes applying uniformly to all of them:

```json
{
  "scope": "org:read org:write",
  "https://commongrants.org/org_ids": [
    "01912a8b-7c3d-7890-abcd-ef1234567890",
    "02a33c9d-1e2f-4a5b-8c7d-9e0f1a2b3c4d"
  ]
}
```

- **Pros**
  - One token can act on many orgs, so a platform needs only one credential.
- **Cons**
  - The scopes apply uniformly to every org in the list, so "read here, write there" isn't expressible.
  - `org_ids` is a custom array claim with no standard behind it, and the token grows with the number of orgs.

#### Option 3: One multi-org token with per-org levels (RFC 9396)

:::note[Bottom line]
RFC 9396 `authorization_details` works if we

- need one token to express different access levels for different orgs,
- but are willing to adopt a format that's more complex to send and parse and isn't universally supported.
  :::

[RFC 9396](https://datatracker.ietf.org/doc/html/rfc9396) defines an `authorization_details` claim: a JSON array where each entry binds an action set to a specific resource, using the standard `type`, `identifier`, and `actions` fields. It's built for exactly the mixed case (read one org, write another) and coexists with scopes rather than replacing them:

```json
{
  "authorization_details": [
    {
      "type": "org_profile",
      "identifier": "01912a8b-7c3d-7890-abcd-ef1234567890",
      "actions": ["read"]
    },
    {
      "type": "org_profile",
      "identifier": "02a33c9d-1e2f-4a5b-8c7d-9e0f1a2b3c4d",
      "actions": ["read", "write"]
    }
  ]
}
```

- **Pros**
  - The one real standard for expressing different access levels per org in a single token.
  - Coexists with the operation-scope vocabulary rather than replacing it.
- **Cons**
  - Heavier for issuers to mint and receivers to parse than a single `org_id`.
  - Not universally supported across identity providers yet.

### Updating a profile

_A direct `PATCH`, a submitted `POST /changes`, or both over one change ledger?_

Both write paths append to the same change ledger (`GET /orgs/{orgId}/changes`); the difference is whether the edit applies immediately or can be queued for review. A `PATCH` creates and applies a change in one step (recorded as `accepted`), which suits trusted in-system edits. A `POST /orgs/{orgId}/changes` submits a change a receiver can return as `pending`, which suits proposals from external systems. Both use the same JSON Merge Patch body. A full `PUT` replace isn't offered, since a sender that doesn't model every field would clear the ones it omits (see [partial-update format](#partial-update-format)).

#### Side-by-side comparison

- ✅ Criterion met
- ❌ Criterion not met
- 🟡 Partially met or unsure

| Criteria                                  | Both (rec.) | PATCH only | POST /changes only | PUT (full replace) |
| ----------------------------------------- | :---------: | :--------: | :----------------: | :----------------: |
| Simple, familiar direct edits             |     ✅      |     ✅     |         🟡         |         ✅         |
| Safe when systems model different fields  |     ✅      |     ✅     |         ✅         |         ❌         |
| Proposals can be queued for review        |     ✅      |     ❌     |         ✅         |         ❌         |
| One change ledger behind every write      |     ✅      |     ✅     |         ✅         |         🟡         |
| Lets adopters match their own trust model |     ✅      |     ❌     |         ❌         |         ❌         |

#### Option 1: Support both, over one ledger (recommended)

:::note[Bottom line]
Supporting both is the best fit if we

- want a simple, familiar `PATCH` for trusted direct edits and a safer `POST /changes` for reviewable proposals, both landing in one ledger,
- but are willing to build two write entry points instead of one.
  :::

A `PATCH /orgs/{orgId}` is the direct path: the receiver applies the edit and records it as an `accepted` change behind the scenes. A `POST /orgs/{orgId}/changes` is the reviewable path: the change is created with its own ID and status and can sit as `pending` until a receiver approves it.

```
POST /orgs/{orgId}/changes
→ 202 Accepted
  Location: /orgs/{orgId}/changes/01926d3f-8a2b-7c4e-9d01-23456789abcd

{ "id": "01926d3f-8a2b-7c4e-9d01-23456789abcd", "status": { "value": "pending" }, "patch": { "mission": "..." } }
```

Both take the same JSON Merge Patch body and both show up in `GET /orgs/{orgId}/changes`, so history is uniform no matter how a write arrived. The two paths use different scopes (`org:write` for `PATCH`, `org.changes:write` for `POST /changes`, mirroring `org.changes:read`), so a deployment can grant a partner the ability to propose changes without granting direct-write access. A deployment can expose whichever entry points fit its trust model:

- just `PATCH`, if it only makes trusted in-system edits,
- just `POST /changes`, if it only accepts changesets from outside,
- or both.

This mirrors the two OAuth flows: one contract, and adopters use the entry points that fit.

This is a common pattern in existing APIs, where you `POST` to create an object and get back an `id` and a `status` to check later:

- [Stripe](https://docs.stripe.com/api/refunds/object) models a refund or a payment intent this way,
- [Gerrit](https://gerrit-review.googlesource.com/Documentation/rest-api-changes.html) uses a literal `/changes/` collection whose entries each have a status,
- GitHub does the same with pull requests,

The broader async convention returns [`202 Accepted`](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.3) with a status monitor to poll, as in [Google's long-running operations](https://google.aip.dev/151) and the [Microsoft REST guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/graph/patterns/long-running-operations.md).

- **Pros**
  - Gives a trusted writer a familiar `PATCH` and an external proposer a reviewable submission, without forcing either into the other's shape.
  - Every write, whichever path, appends to one ledger, so provenance and history stay uniform.
  - Adopters implement only the entry points their trust model needs.
- **Cons**
  - Two write entry points are more to build, test, and document than one.
  - A deployment that exposes both must keep their behavior (validation, provenance, status) consistent.

#### Option 2: Direct `PATCH` only

:::note[Bottom line]
A direct `PATCH` alone works if we

- can trust every writer to apply edits directly,
- but are willing to give external systems no way to propose a change for review, only to apply one.
  :::

- **Pros**
  - The smallest, most familiar write surface: one verb, applied immediately.
  - Still records each edit in the change ledger.
- **Cons**
  - No reviewable path: a receiver can only accept or reject a direct write, not queue an untrusted sender's change as a proposal.

#### Option 3: `POST /changes` only

:::note[Bottom line]
Routing every write through `POST /changes` works if we

- want a single, uniform write path,
- but are willing to add a create-then-check step to even the simplest trusted edit.
  :::

- **Pros**
  - A single write path to build and secure, with no direct-mutation verb to reconcile.
  - Every write is a first-class change with its own ID and status to inspect.
- **Cons**
  - Heavier for the common trusted edit: create a change, then check its status, where a `PATCH` would be a single call.

#### Option 4: `PUT` full replace (not offered)

:::note[Bottom line]
A full `PUT` replace works only if

- every writer always has the complete, canonical record,
- but we're unwilling to risk a strict replace clearing fields the sender doesn't model, the cross-system data loss this contract exists to prevent, so it isn't offered.
  :::

Different systems won't support the same set of optional fields. If System A knows only `name` and `mission`, a full `PUT` wipes whatever System B populated but System A doesn't model; a `PATCH` (or a `POST /changes` with a merge patch) touches only the fields it sends:

```
# PUT: fields System A omits (socials, addresses, ...) get wiped
PUT /orgs/{orgId}
{ "name": "Example Nonprofit", "mission": "..." }

# PATCH: unmentioned fields survive
PATCH /orgs/{orgId}
{ "mission": "..." }
```

- **Pros**
  - One write verb, and replace semantics are simple to reason about.
- **Cons**
  - A sender that doesn't model every field can silently wipe another system's data.
  - Changing one field means transmitting the whole record.

### Partial-update format

_JSON Merge Patch, JSON Patch, field masks, or a combination?_

#### Side-by-side comparison

| Criteria                                           | Merge Patch (rec.) | JSON Patch (`op`) | Field masks |
| -------------------------------------------------- | :----------------: | :---------------: | :---------: |
| Patch body has the same shape as the org record    |         ✅         |        ❌         |     🟡      |
| No separate operations format to learn             |         ✅         |        ❌         |     🟡      |
| Tells "clear a field" apart from "leave unchanged" |         🟡         |        ✅         |     ✅      |
| Element-level array operations                     |         ❌         |        ✅         |     ❌      |
| Widely supported as an RFC standard                |         ✅         |        ✅         |     🟡      |

#### Option 1: JSON Merge Patch, RFC 7396 (recommended)

:::note[Bottom line]
JSON Merge Patch is the best fit if we

- want the patch body to look like the org record adopters already work with,
- but are willing to give up editing a single array element and let `null` mean "clear."
  :::

The patch body looks just like the org record: include a field to set it, leave it out to keep it unchanged, or send `null` to clear it. Sent as `application/merge-patch+json` ([RFC 7396](https://datatracker.ietf.org/doc/html/rfc7396)):

```json
{
  "mission": "To expand access to community health resources.",
  "socials": { "website": null }
}
```

This sets `mission`, clears `socials.website`, and leaves every other field untouched.

- **Pros**
  - Reuses the org record shape, so there's nothing new to learn.
  - Compact for small diffs.
  - A standard (RFC 7396), sent as `application/merge-patch+json`.
- **Cons**
  - Can't target a single array element; an array is replaced whole.
  - `null` is overloaded to mean "clear," so "set this field to literal null" isn't separately expressible.

#### Option 2: JSON Patch, RFC 6902

:::note[Bottom line]
JSON Patch works if we

- need element-level array edits and an explicit list of operations,
- but are willing to introduce a second format, keyed off JSON Pointer paths, that doesn't match the org record shape.
  :::

The same change is a list of operations keyed off JSON Pointer paths ([RFC 6902](https://datatracker.ietf.org/doc/html/rfc6902)), sent as `application/json-patch+json`:

```json
[
  {
    "op": "replace",
    "path": "/mission",
    "value": "To expand access to community health resources."
  },
  { "op": "remove", "path": "/socials/website" }
]
```

- **Pros**
  - Explicit operations (`add`, `remove`, `replace`, `move`), including on array elements.
  - Unambiguous about clearing versus setting null.
- **Cons**
  - A separate operations format with pointer paths, unlike the record-shaped body adopters already use.
  - More than org sync needs.

#### Option 3: Field masks (Google style)

:::note[Bottom line]
Field masks work if we

- want a change to name the fields it touches alongside the values,
- but are willing to maintain a parallel mask field and adopt a pattern that's less common in REST/JSON APIs.
  :::

The changed fields are named in a mask alongside the values, following [Google's field mask convention](https://google.aip.dev/161):

```json
{
  "updateMask": "mission,socials.website",
  "org": {
    "mission": "To expand access to community health resources.",
    "socials": { "website": null }
  }
}
```

- **Pros**
  - An explicit `updateMask` cleanly separates "fields I'm setting" from "fields I'm leaving alone," including clearing.
- **Cons**
  - Adds a parallel mask field to keep in step with the body.
  - Less idiomatic for JSON REST APIs than Merge Patch.

### Viewing historical changes

_A change log, a list of revisions, or a point-in-time query?_

The changes endpoint is optional, and a deployment MAY squash intermediate snapshots, so the contract doesn't require every version to be retrievable. That squash allowance is a key driver below.

#### Side-by-side comparison

| Criteria                                           | Version list (rec.) | Change log | Point-in-time `?at=` |
| -------------------------------------------------- | :-----------------: | :--------: | :------------------: |
| Direct lookup of a record at a known version       |         ✅          |     ❌     |          ✅          |
| Tolerates snapshot squashing                       |         ✅          |     ❌     |          🟡          |
| Composes with the existing dataset-version concept |         ✅          |     🟡     |          ✅          |
| Fine-grained "who changed which field"             |         🟡          |     ✅     |          ❌          |
| Cheapest server-side storage                       |         🟡          |     ✅     |          ❌          |
| Browsable without knowing a version up front       |         ✅          |     ✅     |          ❌          |

#### Option 1: Version list of full snapshots (recommended)

:::note[Bottom line]
A list of full snapshots is the best fit if we

- want consumers to retrieve a record at a known version and a history that tolerates squashing,
- but are willing to store more than a change log and derive per-field detail by diffing snapshots.
  :::

`GET /orgs/{orgId}/changes` returns a list of changes, each with its version metadata and, optionally, both the Merge Patch that was submitted and a full snapshot with it applied (the full payload is shown under [View changes](#operations-with-example-payloads)):

```json
{
  "datasetVersion": 9,
  "lastModifiedAt": "2026-06-20T14:30:00Z",
  "patch": { "mission": "..." },
  "snapshot": { "name": "...", "mission": "..." }
}
```

With full snapshots:

- fetching a record at a known version is a direct lookup, with no event replay,
- diffing two versions is "fetch both and compare,"
- dropping intermediate versions (the squash the contract allows) still leaves a navigable timeline.

This composes with the dataset-version number reads and writes already return. An optional `?at={timestamp}` parameter on the read is a complementary pattern: it lets a consumer ask for "the record as of then" without learning a separate history shape. The version-list shape is common in the wild, like [Google Drive revisions](https://developers.google.com/drive/api/reference/rest/v3/revisions), Confluence versions, and MediaWiki history.

- **Pros**
  - Direct version lookup, no replay.
  - Straightforward diffing.
  - Tolerates squashing, which the contract explicitly permits.
  - Self-contained snapshots remain usable as the schema changes over time.
- **Cons**
  - More storage than a change log, especially for large records that change often.
  - Per-field "who changed what" means comparing adjacent snapshots.

#### Option 2: Change log of field-level deltas

:::note[Bottom line]
A change log works if we

- prioritize cheap storage and fine-grained activity tracking,
- but are willing to push state reconstruction onto consumers and give up clean squashing.
  :::

History is a stream of field-level deltas, sized by activity rather than record size:

```json
{
  "field": "mission",
  "from": "To provide...",
  "to": "To expand...",
  "at": "2026-06-20T14:30:00Z"
}
```

- **Pros**
  - Cheapest to store: append-only events sized by activity, not record size.
  - Easy to filter by field, actor, or time, and a natural fit for activity feeds.
- **Cons**
  - Rebuilding state at a point in time means replaying events from the start.
  - Diffing two arbitrary points means folding events together.
  - Tightly coupled to the schema shape, and squashing loses individual events.

#### Option 3: Point-in-time query only

:::note[Bottom line]
A point-in-time query alone works if we

- prioritize a small surface and cheap access to historical state,
- but are willing to keep consumers from browsing history without a known version or timestamp, and to put the most load on the server.
  :::

There's no history list; a consumer reads the main endpoint with an `?at=` timestamp and gets the full record as of that moment:

```
GET /orgs/{orgId}?at=2026-03-15T00:00:00Z
→ full org record as it stood on that date
```

- **Pros**
  - No new endpoint; reuses the main read with an added parameter.
  - One request returns the full state at the requested moment.
- **Cons**
  - No way to list versions or actors, so history isn't discoverable in a UI.
  - Highest server cost, since arbitrary point-in-time answers need fine-grained snapshots or on-demand replay.

### Acceptance

_Does a change resolve immediately, or can its `status` also represent a queued review?_

Every successful write returns a change record with a `status` attribute. A 2xx `PATCH` response always has `status: accepted`, since these updates are made directly by trusted clients, following `PATCH` semantics. The main question is whether a `POST /changes` submission can also come back `pending` for later review, or whether every change should be resolved immediately.

#### Side-by-side comparison

| Criteria                                        | Status supports both (rec.) | Always immediate | Always queued |
| ----------------------------------------------- | :-------------------------: | :--------------: | :-----------: |
| Supports immediate-apply deployments            |             ✅              |        ✅        |      ❌       |
| Supports approval-gated deployments             |             ✅              |        ❌        |      ✅       |
| One status model regardless of workflow         |             ✅              |        ❌        |      ❌       |
| Simple for the always-apply case                |             🟡              |        ✅        |      ❌       |
| Submitter can tell whether a change took effect |             ✅              |        ✅        |      ✅       |

#### Option 1: Status supports both outcomes (recommended)

:::note[Bottom line]
A change `status` that can represent either an immediate result or a queued review is the best fit if we

- want one contract to serve both immediate-apply and approval-gated deployments,
- but are willing to have a receiver that always applies immediately still return a `status`.
  :::

A change comes back with a `status` in `data`, so the same shape works whether the receiver applies it or queues it for review.

Applied immediately:

```json
{
  "id": "01926d3f-8a2b-7c4e-9d01-23456789abcd",
  "status": { "value": "accepted" },
  "datasetVersion": 9
}
```

Queued for review:

```json
{
  "id": "01926d3f-8a2b-7c4e-9d01-23456789abcd",
  "status": { "value": "pending" }
}
```

The full set is `accepted` (applied), `denied` (rejected, with a reason), `pending` (queued for review), or `superseded` (a newer change won), so a submitter doesn't have to know the receiver's workflow ahead of time. A `PATCH` is always `accepted` immediately, so this really governs the `POST /changes` path. How each status maps to an HTTP code is left to the follow-up spec.

- **Pros**
  - One contract spans both immediate and queued deployments.
  - The submitter always learns what happened to its change.
  - Adding an approval workflow later doesn't change the contract.
- **Cons**
  - A receiver that always applies immediately still returns a `status` it may not need, though it can point trusted clients to `PATCH`.
  - The status values and their fields need careful definition so receivers report them consistently.

#### Option 2: Always immediate

:::note[Bottom line]
Resolving every change on submission works if we

- can assume no deployment ever needs review,
- but are willing to give up representing a queued change, leaving `POST /changes` little different from `PATCH`.
  :::

- **Pros**
  - Simplest model: a change is `accepted` (or `denied`) the moment it's submitted.
- **Cons**
  - No way to represent a queued change, so approval-gated receivers can't take part.

#### Option 3: Always queued

:::note[Bottom line]
Queuing every change works if we

- want every change to go through review,
- but are willing to force immediate-apply receivers to model a `pending` state they never use.
  :::

- **Pros**
  - Natural for review-heavy workflows.
- **Cons**
  - Overhead for receivers that apply immediately, which still expose a `pending` state and a way to learn the final outcome.

### Provenance

_Is provenance derived from the validated JWT, or taken from the request body?_

Provenance here means who made a change and which system it came from. What a receiver then stores to represent it (the history shape, retention, how an actor is referenced) is deferred to the follow-up spec; the decision here is only where that information comes from.

#### Side-by-side comparison

- ✅ Criterion met
- ❌ Criterion not met
- 🟡 Partially met or unsure

| Criteria                                         | From the JWT (rec.) | From the request body |
| ------------------------------------------------ | :-----------------: | :-------------------: |
| Can't be forged or tampered by the sender        |         ✅          |          ❌           |
| Anchored to an authenticated identity            |         ✅          |          ❌           |
| Nothing extra for the client to send or validate |         ✅          |          🟡           |
| Can attribute a change to a non-token actor      |         🟡          |          ✅           |

#### Option 1: Derived from the JWT claims (recommended)

:::note[Bottom line]
Deriving provenance from the validated token is the best fit if we

- want a trail a sender can't forge,
- but are willing to identify the actor only as specifically as the token's own identity allows, rather than through a self-declared body field.
  :::

The receiver takes the acting identity from the validated JWT (`sub`, plus the consenting user it represents in a delegated flow) and the source system from request context. The `PATCH` body contains only profile fields, never a self-declared actor, so a sender can't claim to be someone else. If a change needs to be attributed to a specific end user rather than a service account, that comes from a delegated token whose `sub` is that user (or a dedicated actor claim), still signed by the authorization server.

- **Pros**
  - A sender can't forge the actor; provenance is only as trustworthy as the signed token.
  - Nothing extra for the client to send, and no body field for the server to second-guess.
  - Consistent with the token that already authorizes the request.
- **Cons**
  - Attributing a change to a specific end user means issuing a token for that user (or including an actor claim), not just setting a body field.

#### Option 2: Included in the request body (not recommended)

:::note[Bottom line]
Taking provenance from the request body works if we

- want to let a sender attribute a change to any actor it chooses,
- but are willing to accept a value the receiver can't trust, since anyone who can write can set it to anything.
  :::

The sender declares who made the change alongside the profile fields:

```json
{
  "modifiedBy": "jane.doe@example.com",
  "mission": "To expand access to community health resources."
}
```

It's flexible, since a platform can attribute a change to any of its internal users without minting a token per user, but the value is unverified: a receiver can't tell a truthful `modifiedBy` from a forged one, so it can't be trusted for audit.

- **Pros**
  - Simple, and lets a sender attribute a change to any actor without a per-actor token.
- **Cons**
  - Unverified and easily tampered with: anyone who can write can set it to anything, so it's worthless as an audit signal.
  - Puts whatever the sender chooses, often PII, into the shared payload.
