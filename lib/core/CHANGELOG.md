# @common-grants/core

## 0.4.0

### Minor Changes

- 896535c: Add an `AwardBase` model and award routes to the core library (#954).

  `AwardBase` tracks the funder, recipient, and financial details of a grant award,
  with references to the source opportunity and application, and support for both
  organization and individual recipients. It is accompanied by the `AwdStatus`,
  `AwdFunding`, `AwdTimeline`, `AwdIds`, `AwdRef`, and `AwdRecipientIndividual`
  sub-models, plus `AwdFilters`/`AwdSorting` for search. New experimental routes
  are added: `GET /common-grants/awards/`,
  `POST /common-grants/awards/search`, and `GET /common-grants/awards/{awdId}`.

  Introduces lightweight reference forms for the models an award points at:
  `OppRef`, `AppRef`, and `OrgRef` (plus `OrgRefCollection`). Each
  reference carries the identity fields of its base model and is spread into that
  base (like `SystemMetadata`), so the base and its reference form stay in sync and
  reference-field changes surface in the base model's changelog.

  Also renames `ApplicationBase.name` to `title` (versioned via `@renamedFrom`) so
  it aligns with `AppRef`. All changes are added at protocol version 0.4.0.

- 896535c: Add `BooleanComparisonFilter` to the core filter catalog (#895). `BooleanComparisonFilter`
  compares a boolean value with `eq`/`neq`. It is added at protocol version 0.4.0 and emitted to
  JSON Schema output.
- 896535c: Add an `ExtensibleEnum` base model and `ExtensibleEnumT<T>` templated model to the core
  fields library (#961), formalizing the extensible enum pattern (a `value` from a predefined
  set of options, plus optional `customValue` and `description`). Every extensible enum field —
  `OppStatus`, `AppStatus`, `ApplicantType`, `FormResponseStatus`, `CompetitionStatus`, and the
  0.4.0 additions `AwdStatus` and `RevisionStatus` — is now defined via `ExtensibleEnumT`, so the
  pattern has a single source of truth. Also adds the previously missing `custom` option to
  `FormResponseStatusOptions` at protocol version 0.4.0. Emitted schema shapes are unchanged
  apart from property description wording.
- 896535c: Add identifier models to the core library (#957).

  Introduces the models that carry a record's external identifiers, following
  the pattern in ADR-0023:

  - `IdentifierT<Id, Code>`, a template that pins an identifier's value type and
    its `registry.code`, plus the generic `Identifier` it instantiates and the
    `IdentifierStatus` options (`active`, `archived`) used by `allIds`.
  - `SystemId`, the hosting system's own UUID for a record, whose registry code
    names that system (e.g. `org:grants.gov:system`).
  - `IdentifierCollection`, which holds a record's `systemId` plus any
    registries the protocol does not define as base identifiers, under
    `otherIds`.
  - `OrgIds`, the organization collection, which adds the `org:us:ein`,
    `org:us:uei`, and `org:xi:duns` base identifiers as `OrgIdEin`, `OrgIdUei`,
    and `OrgIdDuns`. Registry codes follow `<schema>:<scope>:<prop>`.

  Breaking: `OrganizationBase.ein`, `uei`, and `duns` are removed in favor of
  the `identifiers` collection, so a producer that sent `ein` now sends
  `identifiers["org:us:ein"].id`.

  Breaking: the `employerTaxId`, `samUEI`, and `duns` scalars are tightened to
  their registry formats. `employerTaxId` and `duns` now require nine digits
  with no separators, where `employerTaxId` previously required the hyphenated
  `12-3456789` form and `duns` accepted several separator styles. `samUEI` now
  excludes the letters `I` and `O` and no longer accepts lowercase.

  All changes are added at protocol version 0.4.0.

- 896535c: Add organization profile syncing models and routes to the core library (#962).

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
  - `Responses.AcceptedT<T>`, a `202` envelope with a `Location` header for
    changes that are accepted for review, plus its non-templated `Accepted`
    schema and the `Responses.Forbidden` error alias the org routes return.

  Adds six experimental routes under `/common-grants/orgs`, each requiring an
  OAuth 2.0 scope: `GET /orgs` (`org:read`), `GET /orgs/{orgId}` (`org:read`),
  `PATCH /orgs/{orgId}` (`org:write`), `POST /orgs/{orgId}/changes`
  (`org.changes:write`), `GET /orgs/{orgId}/changes` (`org.changes:read`), and
  `GET /orgs/{orgId}/changes/{changeId}` (`org.changes:read`). The routes declare
  an OAuth2 security scheme with the client credentials and authorization code
  flows; the flow URLs are illustrative placeholders each deployment overrides.

  All changes are added at protocol version 0.4.0 and marked experimental.

- 896535c: Add non-templated response schemas (`Ok`, `Paginated`, `Sorted`, `Filtered`, `Created`) so they are emitted as standalone JSON schemas, and rename the templated variants with a `T` suffix (`OkT<T>`, `PaginatedT<T>`, `SortedT<T>`, `FilteredT<ItemsT, FilterT>`, `CreatedT<T>`). Routes now use the `T`-suffixed templates; specs consuming the old templated names (e.g. `Responses.Ok<T>`) must switch to the `T`-suffixed equivalents. The wire contract of route responses is unchanged.

## 0.3.5

### Patch Changes

- c2eb9d3: Bump TypeSpec packages from 1.12.0 to 1.13.0 (no breaking changes)

## 0.3.4

### Patch Changes

- 941413f: Document Node 22 as the minimum supported runtime via `engines.node: ">=22.0.0"`. Node 20 reached end of maintenance on 2026-04-30; this aligns the packages with current LTS and matches the runtime requirement upstream from `@typespec/compiler` 1.12+.

  Consumers of `@common-grants/sdk` who only import the published Zod schemas or TypeScript types at runtime are unaffected. The Node 22 floor applies when invoking `tsp` (via `@common-grants/cli` or compiling `@common-grants/core`) or building the SDK from source.

  Migration: the repo includes `.nvmrc` at root. Switch your local Node with `nvm use`, `fnm use`, or your runtime manager of choice.

## 0.3.3

### Patch Changes

- 2271168: Bump TypeSpec packages from 1.10.0 to 1.11.0 (no breaking changes)

## 0.3.2

### Patch Changes

- ec49dc4: Fix peer dependencies and UEI example value
  - `npm install` raised a warning about peer dependencies for `@typespec/rest` and `@typespec/versioning` so we updated them to align with the other TypeSpec packages.
  - The previous UEI example values didn't match the pattern required for the UEI type, so we updated the example to match.

## 0.3.1

### Patch Changes

- c2b9145: Updates dependencies

## 0.3.0

### Minor Changes

- 9f86b7b: Adds models and routes for application reviews.
  - Adds new OpenAPI tag for "Application reviews"
  - Adds new route `POST /common-grants/applications/search/` and a set of supporting models
  - Changes `NumberComparisonFilter.operator` type to `ComparisonOperators | EquivalenceOperators` so that we can filter using `eq` and `neq` in addition to `ge`, `gte`, etc.
  - Adds explicit `@Versioning.added()` decorator to all schemas, so that the version in which a schema was added is explicitly defined, rather than defaulting to v0.1.0

## 0.2.4

### Patch Changes

- 4ad6c73: Updates dependencies
  - Updates both `@common-grants/core` and `@common-grants/cli` to use the latest TypeSpec library versions
  - Updates `@common-grants/cli` to reference `@common-grants/core` as a dev dependency instead of a direct dependency

## 0.2.3

### Patch Changes

- f5187cb: Updates dependencies

## 0.2.2

### Patch Changes

- 300e191: Fix bug in phone number validation logic

## 0.2.1

### Patch Changes

- e50db9c: Fix version decorators for OpenAPI spec.

  Decorates the routes, schemas, and properties that were added in v0.2.0 with the `@Versioning.added()` decorator. This ensures that those items are omitted from the v0.1.0 OpenAPI spec when it is generated from the TypeSpec project.

## 0.2.0

### Minor Changes

- 66b75a7: Adds apply routes and models

  Adds the following routes for to support apply:
  - Competitions
    - `GET /common-grants/competitions/{compId}` View competition details
  - Applications
    - `POST /common-grants/applications/start` Start an application
    - `GET /common-grants/applications/{appId}` View an application
    - `PUT /common-grants/applications/{appId}/forms/{formId}` Respond to a form
    - `GET /common-grants/applications/{appId}/forms/{formId}` View form responses
    - `PUT /common-grants/applications/{appId}/submit` Submit an application
  - Forms
    - `GET /common-grants/forms` List forms
    - `GET /common-grants/forms/{formId}` View form details

  Adds the following models used by the apply routes:
  - Application
    - `ApplicationBase`
    - `ApplicationStatus`
    - `ApplicationStatusOptions`
  - Form
    - `FormBase`
    - `FormJsonSchema`
    - `FormUISchema`
  - Form Response
    - `FormResponseBase`
    - `FormResponseStatus`
    - `FormResponseStatusOptions`
  - Competition
    - `CompetitionBase`
    - `CompetitionStatus`
    - `CompetitionStatusOptions`
    - `CompetitionForms`
    - `CompetitionTimeline`
  - Mappings
    - `MappingSchema`
    - `MappingFunction`
    - `MappingConstantFunction`
    - `MappingFieldFunction`
    - `MappingSwitchFunction`
  - Applicant Types
    - `ApplicantType`
    - `ApplicantTypeOptions`

## 0.1.1

### Patch Changes

- 81ab1fe: Updates TypeSpec package versions in dependencies

  **Note:** We are pinning `@typespec/json-schema` at v1.0.0 because v1.1.0 has a bug in it. See this [issue](https://github.com/microsoft/typespec/issues/7828) for more details.

## 0.1.0

### Minor Changes

- a94b159: Publish first `@common-grants/core` release
