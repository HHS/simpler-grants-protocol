---
"@common-grants/core": minor
---

Add organization profile syncing models and routes to the core library (#962).

Introduces the models needed to view and sync organization profiles across
systems, following the contract in ADR-0026:

- `OrgPatchData`, a JSON Merge Patch (RFC 7396) body derived from
  `OrganizationBase` where every field is optional, clearable fields accept
  `null`, and read-only fields like `id` are excluded.
- `RevisionT<SnapshotT, PatchT>`, a generic change record with a
  `status`, `source`, `patch`, and `snapshot`, plus its untyped form `Revision`,
  `RevisionStatus`, and the status options (`pending`, `accepted`, `denied`,
  `superseded`, `custom`). `OrgRevision` binds it to `OrganizationBase` and
  `OrgPatchData`.
- `Responses.Accepted<T>`, a `202` envelope with a `Location` header for changes
  that are accepted for review.

Adds six experimental routes under `/common-grants/orgs`, each requiring an
OAuth 2.0 scope: `GET /orgs` (`org:list`), `GET /orgs/{orgId}` (`org:read`),
`PATCH /orgs/{orgId}` (`org:write`), `POST /orgs/{orgId}/changes`
(`org.changes:write`), `GET /orgs/{orgId}/changes` (`org.changes:read`), and
`GET /orgs/{orgId}/changes/{changeId}` (`org.changes:read`). The routes declare
an OAuth2 security scheme with the client credentials and authorization code
flows; the flow URLs are illustrative placeholders each deployment overrides.

All changes are added at protocol version 0.4.0 and marked experimental.
