---
title: CommonGrants protocol v0.6.0
description: A specification for the CommonGrants protocol.
---

:::tip[Version History]
This is the current specification (v0.6.0). View previous versions:

- [v0.1.0](/protocol/specification/v0_1_0) - Original draft specification
  :::

This document outlines the technical specification for the CommonGrants protocol, which defines:

- The required routes, operations, and schemas for a CommonGrants API;
- The patterns for implementing custom behavior.

Not interested in the technical details? Check out:

- The [OpenAPI docs](/protocol/api-docs) for a high-level overview of the API endpoints supported by the protocol;
- The [Models](/protocol/models) page for a detailed breakdown of the data elements defined by the protocol.

:::note

CommonGrants is pre-1.0 and still evolving. Routes marked experimental may change between releases. We welcome your feedback on our [co-planning board](https://commongrants.fider.io).

:::

## Definitions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [BCP 14](https://tools.ietf.org/html/bcp14), [RFC2119](https://www.rfc-editor.org/rfc/rfc2119.html), and [RFC8174](https://www.rfc-editor.org/rfc/rfc8174.html) when, and only when, they appear in all capitals, as shown here.

#### CommonGrants protocol

The CommonGrants protocol defines a set of REQUIRED API routes, operations, and schemas that a CommonGrants API MUST implement to be considered compliant. It also defines an OPTIONAL pattern for extending the base protocol with implementation-specific behavior.

#### OpenAPI document

An OpenAPI document is a JSON or YAML document that conforms to the [OpenAPI Specification](https://swagger.io/specification/) and formally describes an API.

#### API document

A CommonGrants API document is an OpenAPI document that conforms to the CommonGrants protocol and formally describes the routes and operations of a CommonGrants API.

Developers MAY draft their API document in TypeSpec, using the [CommonGrants core library](https://www.npmjs.com/package/@common-grants/core) and [CLI](https://www.npmjs.com/package/@common-grants/cli), before compiling it to an OpenAPI document. This approach allows developers to leverage features such as intellisense and compile-time checks that increase the likelihood of compliance with the CommonGrants protocol.

#### CommonGrants API

A CommonGrants API is a software platform or system that implements all of the REQUIRED CommonGrants routes and operations, with an OPTIONAL set of _implementation-defined_ extensions.

#### Routes and operations

CommonGrants routes and operations provide a formal description of CommonGrants API endpoints and the actions they perform, standardizing the interface between a CommonGrants API and its clients. These routes and operations are defined using TypeSpec and compile to an OpenAPI document.

There are three main categories of routes and operations:

- Required routes that are stable and MUST be implemented.
- Optional routes that are stable and MAY be implemented, but are NOT REQUIRED.
- Experimental routes that are unstable, intended for feedback, and are NOT REQUIRED.

#### Schemas

CommonGrants schemas formally describe how data SHOULD be represented within a CommonGrants API route or operation. These schemas are defined using TypeSpec and compile to other formats, such as OpenAPI schemas and JSON schemas.

Some CommonGrants schemas can be modified to support _implementation-defined_ behavior.

#### Implementation-defined behavior

The protocol categorizes certain behaviors as _implementation-defined_, which means that CommonGrants APIs have modified the default behavior using a protocol-defined extension pattern. This pattern allows implementations to support custom functionality while maintaining consistency and compatibility with other CommonGrants APIs.

#### Compliance

An API is "compliant" with the CommonGrants protocol if:

- It correctly implements all required routes and operations, with inputs and outputs that conform to the corresponding CommonGrants schemas
- It does not implement any API endpoints that directly conflict with the optional routes and operations defined by the protocol
- It follows the guidelines outlined in the CommonGrants protocol for all _implementation-defined_ extensions of any default routes, operations, and schemas

Developers MAY use the [CommonGrants CLI](https://www.npmjs.com/package/@common-grants/cli) to validate their API document and implementation against the CommonGrants protocol.

:::note
The requirements for compatibility do not extend to experimental routes and operations, since these are intended for feedback and are not yet stable.
:::

## Specification

### Versions

The CommonGrants protocol follows the `Major.Minor.Patch` versioning scheme, where:

- the `Major` version is incremented when backwards-incompatible changes are made to the protocol. These changes may include:
  - Adding new required routes or operations;
  - Adding new required fields to existing schemas;
  - Removing existing fields from existing schemas;
  - Removing an option from an existing enum field;
  - Changing the type of an existing field; or
  - Changing the protocol in other ways that would make existing CommonGrants APIs non-compliant.
- the `Minor` version is incremented when backwards-compatible changes are made to the protocol. These changes may include:
  - Adding new optional routes or operations;
  - Adding new optional fields to existing schemas;
  - Adding new options to existing enum fields; or
  - Making other changes that introduce new functionality without making existing implementations non-compliant.
- the `Patch` version is incremented when the protocol is updated in ways that don't change its contract. A patch never changes schemas, validation, required routes, or status codes; a fix that changes any of these is published as a new `Minor` or `Major` version. Patch changes may include:
  - Updating the descriptions or metadata of existing routes, operations, and schemas in ways that don't change their behavior;
  - Fixing typos or other minor changes that don't affect the protocol's behavior; or
  - Making other changes that leave schemas, validation, required routes, and status codes unchanged.

:::caution
Because experimental routes and operations are considered unstable, breaking changes can be made to these routes and operations without incrementing the `Major` version.
:::

A CommonGrants API MAY serve more than one protocol version. A client selects a version with the CommonGrants version request header, `CG-Version`, and the server reports the version it served with the CommonGrants served-version response header, `CG-Version-Served`. The rest of this section defines how version negotiation works. The [Versioning](/protocol/versioning) page explains it with examples, and [ADR 0032](/governance/adr/0032-api-version-negotiation/) records the rationale.

The headers, version errors, and discovery route are declared from v0.6.0, and the published v0.1.0 through v0.5.0 contracts don't change. A server that adopts version negotiation applies these rules to every protocol version it serves, including v0.5.0 and earlier.

It is RECOMMENDED that a server move all its routes to a new version at the same time. A server MAY instead serve different versions on different routes, and advertise those routes in [discovery](#discovering-supported-versions).

#### Requesting a version

- A client selects a version only with the `CG-Version` request header. Servers MUST NOT read a version from the URL path, the query string, the `Accept` header, or a vendor media type, and MUST NOT fall back to one.
- `CG-Version` applies only to protocol routes under `/common-grants/`, relative to the API's base URL. Servers MUST ignore it on custom routes and on the discovery route. A host API MAY mount the protocol routes under its own path, such as `/api/v2/common-grants/`; the host's path version and `CG-Version` are independent.
- The value MUST be a full published protocol version: three dot-separated numbers with no leading zeros, such as `0.5.0`. A `v` prefix, a short form such as `0.5`, ranges, and aliases are malformed. The header name is case-insensitive, and servers MUST trim surrounding whitespace before matching the format.
- A request MUST carry at most one value. Because a proxy may fold two header lines into one comma-separated line ([RFC 9110 §5.3](https://www.rfc-editor.org/rfc/rfc9110#section-5.3)), servers MUST treat two header lines, or a comma in the value, as more than one value, and MUST check for that before checking the format.
- Servers MUST match the requested version on major and minor. A server MUST host one patch of each major and minor version it serves and MUST report that full version wherever it lists or reports it. It serves a request for any patch of that major and minor in the version it hosts. For example, a request for `0.5.0` is served by a server hosting `0.5.1`.
- A server MUST NOT serve a different major or minor version than the one requested, even if it serves only one version.
- A request without `CG-Version` is served in the server's default version: the baseline default, or the route's own default when discovery lists the route. A server adopting version negotiation MUST set its default to the version it already serves, and adding versions MUST NOT change the default. A default changes only as described in [Changing the default version](#changing-the-default-version).
- One request is served in one version. The whole response, including nested objects, MUST follow that version's schemas, and the request body MUST be validated against them.
- A server MUST match the route, then resolve the version, then validate the request body, all before any side effect. A route the server doesn't implement returns an ordinary 404. A rejected write MUST change nothing and MUST NOT be retried under another version.

#### Version response headers

- Every response produced after a version is selected MUST carry `CG-Version-Served` with the full version served, including responses served by default and errors such as a missing record or a request body that fails validation. Responses to 401 and 403 MAY omit it, because authentication can run before a version is selected. [Version errors](#version-errors) MUST NOT carry it.
- The served version travels in headers only. Response bodies are the same as in a server that doesn't negotiate versions.
- A successful response without `CG-Version-Served` is unconfirmed: the server may predate version negotiation, or something between the client and the server dropped the request header. A response whose served major or minor version differs from the one requested wasn't served as requested. Clients can't assume either was served in the version they asked for.
- Every cacheable response that depends on `CG-Version` MUST carry `Vary: CG-Version`, including responses served by default.
- Cross-origin servers MUST allow `CG-Version` in `Access-Control-Allow-Headers`, and MUST expose `CG-Version-Served`, `Deprecation`, `Sunset`, and `Link` in `Access-Control-Expose-Headers`.
- Ordinary responses MUST NOT carry a header listing the supported versions. The discovery route and the `version.unsupported` and `version.retired` errors carry that list.
- Version header names use hyphens and no `X-` prefix.

#### Version errors

A version problem returns one of the following errors. It MUST NOT return 404 or 410, because both can be cached by default and clients read them as a missing route or record.

| Case                                                                                                    | `code`                | Status |
| ------------------------------------------------------------------------------------------------------- | --------------------- | ------ |
| Malformed version, such as `banana` or `0.5`                                                            | `version.malformed`   | 400    |
| More than one version value, as two header lines or one comma-separated line, even the same value twice | `version.conflict`    | 400    |
| Version this server, or this route, doesn't serve                                                       | `version.unsupported` | 406    |
| Version retired from this server or this route                                                          | `version.retired`     | 406    |

Each error uses the standard [error response](/protocol/responses/error) envelope, with one entry in `errors` whose `field` is `CG-Version` and whose `code` is one of the values above. Every entry carries `supported` and `defaultVersion`, which describe the route that was called, and the server's discovery URL in `discovery` when it publishes one. `version.unsupported` and `version.retired` also carry the `requested` version and a `scope` of `deployment` (the whole server) or `operation` (only this route). `version.retired` also carries the `sunset` date in RFC 3339 format. `version.malformed` carries the `requested` value as sent, and `version.conflict` omits `requested`. `code` values are stable, so clients branch on them. The [Versioning](/protocol/versioning#version-error-schemas) page shows the full schemas.

After a version's sunset date, requests for it get `version.retired`, as described in [Retiring a version](#retiring-a-version).

#### Discovering supported versions

`GET /common-grants/versions` lists the protocol versions a server serves. The route is OPTIONAL, but a server that serves more than one protocol version MUST implement it (see [Version routes](#version-routes)).

- The route MUST NOT require stronger authentication than the API's required routes, and SHOULD be readable without authentication.
- It takes no request parameters, ignores `CG-Version`, and never returns a version error. Its responses carry neither `CG-Version-Served` nor `Vary: CG-Version`.
- It returns the standard success envelope. In `data`, `versions` and `defaultVersion` are the baseline, which applies to every route without an entry in `operations`. A route whose versions differ from the baseline has an entry in `operations`, keyed by its HTTP method and its path as published in the protocol, such as `GET /common-grants/forms/{formId}`. Path parameter names are ignored when matching a key to a route. A server whose routes all serve the baseline omits `operations`.
- A route serves a version only if that version of the protocol defines the route.
- Every route a baseline version requires serves that version, so the baseline is a compliance claim: the server is compliant with every version in it. Supporting a version doesn't mean implementing that version's optional or experimental routes.
- A default is always one of the versions it applies to, and `upcomingDefault.version` MUST be one of the `versions` it applies to.
- The optional `upcomingDefault` and `deprecated` fields appear only while a change is pending: at the top level for the baseline, or in a route's entry for that route only. Their dates use RFC 3339.
- Each key in `deprecated` MUST be a version from the `versions` beside it, written exactly as it appears there. A client finds the entry for the version it requested by comparing only the major and minor: a client requesting `0.3.0` from a server that lists `0.3.1` finds its entry under `0.3.1`.
- Fields are only ever added to the discovery response. Clients MUST ignore fields they don't recognize, and accept version values published after they were built.

A client that gets 404 from the discovery route treats the server as serving one version that it doesn't advertise.

#### Retiring a version

A server retires a version the same way whether the version is leaving the whole server or one route:

- On every response served in that version on the affected routes, the server MUST send the `Deprecation` header ([RFC 9745](https://www.rfc-editor.org/rfc/rfc9745)), and, once a date is set, the `Sunset` header ([RFC 8594](https://www.rfc-editor.org/rfc/rfc8594)). `Deprecation` uses the `@<unix-timestamp>` form, such as `@1796083200`, and `Sunset` uses an HTTP-date, such as `Tue, 01 Jun 2027 00:00:00 GMT`. Both headers keep their standard meaning and always describe the version the response was served in.
- Alongside them, the server MUST send `Link` headers ([RFC 8288](https://www.rfc-editor.org/rfc/rfc8288)) with `rel="deprecation"`, and with `rel="sunset"` once a sunset date is set, pointing to migration documentation, and with `rel="version-history"` pointing to the discovery route.
- Discovery MUST list the version under `deprecated` with its `deprecation` date and, once set, its `sunset` date: at the top level when the version is leaving the whole server, or in the route's entry when it's leaving one route.
- After the sunset date, the server MUST answer requests for the version with `version.retired`, as described in [Version errors](#version-errors), for a period it chooses, and MAY answer `version.unsupported` after that.
- If the version is a default, the server MUST move that default forward to a newer version no later than the sunset date, announcing the change as described in [Changing the default version](#changing-the-default-version). Responses served by default then carry both the retirement headers and the `successor-version` link. A server can't retire a default unless it serves a newer version for the default to move to.
- A required route can't drop a baseline version that requires the route, so retiring that version from the route means retiring it from the baseline.
- Experimental routes MAY drop a version without notice.

#### Changing the default version

A server MAY change a default version whether or not it keeps serving the old one. Before the change, it MUST announce it:

- On responses served by default from the affected routes, the server MUST send a `Link` header with `rel="successor-version"` ([RFC 5829](https://www.rfc-editor.org/rfc/rfc5829)) pointing to documentation for the new default, and a `Link` header with `rel="version-history"` pointing to the discovery route.
- Discovery MUST show `upcomingDefault` with the new default's `version` and the `date` it takes effect: at the top level for the baseline default, which also covers route entries whose default follows the baseline, or in a route's entry for that route's own default.
- The server MUST NOT send `Deprecation` or `Sunset` for a default change. They appear on responses served by default only when the default version is itself retiring.

Responses to requests that name a version don't change. At the announced date, the default moves to the announced `upcomingDefault.version`.

### Migration notes

Guidance for implementers and consumers moving between protocol versions. Each entry is written as its changes land and is reviewed again before the version is published.

#### v0.6.0

v0.6.0 adds version negotiation and is purely additive: nothing changes for existing clients or servers. The published v0.1.0 through v0.5.0 contracts are unchanged, and a server that doesn't adopt version negotiation stays compliant with the versions it already implements.

##### Version negotiation

- Every protocol route except `GET /versions` declares the optional `CG-Version` request header, and its responses, except the version errors, declare `CG-Version-Served`, `Vary`, `Deprecation`, `Sunset`, and `Link`. In the schema, 400 responses declare `CG-Version-Served` as optional because they share that status with the 400 version errors, and 401 and 403 responses declare it as optional because authentication can run before a version is selected. See [Version response headers](#version-response-headers).
- Every protocol route except `GET /versions` declares the version errors: 400 `version.malformed` and `version.conflict`, and 406 `version.unsupported` and `version.retired`. See [Version errors](#version-errors).
- The new optional `GET /versions` route lists the versions a server serves. A server that serves more than one version MUST implement it. See [Discovering supported versions](#discovering-supported-versions).
- A new `protocolVersion` scalar describes a full `MAJOR.MINOR.PATCH` protocol version, such as `0.6.0`.

##### Adopting version negotiation

A server that adopts version negotiation pins its default to the version it already serves, so clients that send no `CG-Version` keep getting the contract they use today. It sends `CG-Version-Served` on every response produced after a version is selected, whatever version it serves, and `Vary: CG-Version` on cacheable responses. A client of an older version gets one extra response header and, because it sends no `CG-Version`, never a version error.

A client can start sending `CG-Version` to fix the contract it's served in, read `CG-Version-Served` to confirm what it got, call the discovery route to find the versions a server serves, and watch for `Deprecation`, `Sunset`, and `successor-version` links. The [Versioning](/protocol/versioning) page walks through each step.

#### v0.5.0

v0.5.0 renames two fields on competitions and forms, which is a breaking change for anyone who serializes or reads them. Every other change is additive and optional, and the award routes move from experimental to optional.

##### Breaking changes

- [`CompetitionBase`](/protocol/models/competition#competitionbase) replaces the required `opportunityId` with a required `opportunity` reference (`OppRef`), which carries the linked opportunity's `id` and `title`, and optionally its `identifiers`. Producers need the opportunity's title when they serialize a competition. See [migrating competitions](/protocol/models/competition#migrating-from-v04).
- [`FormBase`](/protocol/models/form#formbase) renames the required `name` field to `title`. Form contents, JSON and UI schemas, and mappings are unchanged. See [migrating forms](/protocol/models/form#migrating-from-v04).

The competition and form routes are experimental. Competitions also appear in the optional `competitions` field of `OpportunityDetails`, which the required `GET /opportunities/{oppId}` route returns, so an implementation that populates that field must update the competitions and forms inside it when it moves to v0.5.0. Applications are unaffected: `ApplicationBase` keeps its `competitionId` and `opportunityId` fields.

##### Opportunities

- `OppRef` gains an optional `identifiers` collection, so the `opportunity` reference carried by `AwardBase` and `CompetitionBase` can publish registry-scoped identifiers such as `opp:us:fon` (Federal Opportunity Number) and `opp:us:aln` (Assistance Listing Number) alongside the opportunity's `id` and `title`.
- `OpportunityBase` gains optional `identifiers` and `funders` collections, which an award consumer encounters when it reads the opportunity that an award points at.
- `OpportunityDetails` gains an optional `awards` array of `AwdRef`, publishing the opportunity-to-award link in the reverse direction.
- The `agency` custom field is deprecated for opportunities in favor of `funders`. See [migrating from `agency` to `funders`](/custom-fields/overview#migrating-from-agency-to-funders).

##### Organizations

- [`OrganizationBase`](/protocol/models/organization#organizationbase) gains an optional [`status`](/protocol/models/organization#orgstatus) (`active`, `inactive` or `custom`), which records whether the organization still exists and operates.
- `OrganizationBase` gains an optional `aliases` list and an optional [`relationships`](/protocol/models/organization#orgrelationships) object, whose lists record an organization's parents, children, successors, predecessors, replacement records, and other connections. `aliases` items use a new `Types.nonEmptyString` scalar, and the parent and child kinds include `dba` for a record that is a name its legal entity does business under. See the [organization relationships guide](/guides/organization-relationships/).
- `OrgPatchData` can set or clear `status`, `aliases` and `relationships`.
- The `OrgRef.name` description is reworded to "The name this organization is known by; for a legal entity, its legal name," which also changes `OrganizationBase.name`. This is description-only.

Validators that reject unknown properties need the v0.5.0 schemas before they read these fields. A consumer that converts records down to v0.4.0 should keep the relationship, `aliases` and `status` data somewhere rather than silently drop it, because v0.4.0 has no place for it.

##### Awards

The three award routes move from experimental to optional in v0.5.0. This obliges no implementation to serve them, since optional routes MAY be omitted and the set of required routes is unchanged. It does change their stability guarantee: a breaking change to an award route now requires incrementing the `Major` version under the rules above, instead of being exempt the way changes to experimental routes are.

##### Validating with the CLI

Three notes for anyone validating an implementation with the CommonGrants CLI:

- The CLI selects a bundled copy of each protocol version's spec, and releases so far bundle versions up to v0.4.0, so `cg check spec --protocol-version 0.5.0` needs a CLI release that bundles v0.5.0. Until then, pass the v0.5.0 OpenAPI document published on this site with `--base`.
- Route status is an OpenAPI tag, and tags are not versioned, so the v0.4.0 OpenAPI document published on this site also labels the award routes optional. The copy of the v0.4.0 spec bundled with the CommonGrants CLI is unchanged and still labels them experimental, so `cg check spec --protocol-version 0.4.0` behaves as it did before.
- `cg check spec` classifies a missing optional route as a warning. CLI releases before [#1259](https://github.com/HHS/simpler-grants-protocol/pull/1259) still count that warning in the reported error total and fail the run. From the first `@common-grants/cli` release that includes #1259, a run whose only findings are warnings prints them, marks each one `(warning)`, and passes. This only arises when the base spec being validated against labels the award routes optional, which is true of the v0.5.0 and v0.4.0 documents published on this site. On a CLI release without the fix, `cg check spec --protocol-version 0.4.0` is the workaround, because the v0.4.0 spec bundled with the CLI still labels the award routes experimental. That bundled spec is a generated artifact, so the workaround holds only until the CLI reships it.

### Schemas

The CommonGrants protocol defines the following schemas that are used to represent data in CommonGrants APIs. The schemas are loosely organized into the following categories:

- [Types](#base-types): Foundational data types, like strings, numbers, etc.
- [Fields](#core-fields): Standardized fields that are reused across models.
- [Opportunity Models](#opportunity-models): Domain-specific models for funding opportunities.
- [Apply Models](#apply-models): Domain-specific models for the application process.

#### Base types

**String types**

| Type                                                  | Description                                                                        |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [string](/protocol/types/string#string)               | A sequence of characters                                                           |
| [uuid](/protocol/types/string#uuid)                   | A universally unique identifier                                                    |
| [url](/protocol/types/string#url)                     | A Uniform Resource Locator (URL)                                                   |
| [email](/protocol/types/string#email)                 | An email address                                                                   |
| [employerTaxId](/protocol/types/string#employertaxid) | An Employer Identification Number (EIN)                                            |
| [samUEI](/protocol/types/string#samuei)               | A Unique Entity Identifier (UEI) assigned by the System for Award Management (SAM) |
| [duns](/protocol/types/string#duns)                   | A Data Universal Numbering System (DUNS) number                                    |

**Numeric types**

| Type                                                   | Description                                            |
| ------------------------------------------------------ | ------------------------------------------------------ |
| [numeric](/protocol/types/numeric#numeric)             | A number with an arbitrary precision and scale         |
| [integer](/protocol/types/numeric#integer)             | A whole number without decimals                        |
| [decimalString](/protocol/types/numeric#decimalstring) | A decimal number encoded as a string to preserve scale |

**Date and time types**

| Type                                                  | Description                                                           |
| ----------------------------------------------------- | --------------------------------------------------------------------- |
| [isoTime](/protocol/types/date#isotime)               | Time without timezone in ISO 8601 format (HH:mm:ss)                   |
| [isoDate](/protocol/types/date#isodate)               | Calendar date in ISO 8601 format (YYYY-MM-DD)                         |
| [utcDateTime](/protocol/types/date#utcdatetime)       | Datetime with UTC timezone in ISO 8601 format (YYYY-MM-DDThh:mm:ssZ)  |
| [offsetDateTime](/protocol/types/date#offsetdatetime) | Datetime with timezone in ISO 8601 format (YYYY-MM-DDThh:mm:ss±hh:mm) |
| [calendarYear](/protocol/types/date#calendaryear)     | A calendar year in the format YYYY                                    |

**Other types**

| Type                                     | Description                     |
| ---------------------------------------- | ------------------------------- |
| [boolean](/protocol/types/other#boolean) | A true or false value           |
| [array](/protocol/types/other#array)     | An ordered list of values       |
| [record](/protocol/types/other#record)   | A collection of key-value pairs |
| [null](/protocol/types/other#null)       | A null value                    |
| [unknown](/protocol/types/other#unknown) | A value of with any type        |

#### Core fields

The CommonGrants protocol defines the following fields that are reused across models:

| Field                                        | Description                                       |
| -------------------------------------------- | ------------------------------------------------- |
| [Money](/protocol/fields/money)              | A monetary amount with a currency code            |
| [Event](/protocol/fields/event)              | A description of an event with an associated date |
| [CustomField](/protocol/fields/custom-field) | A model for defining custom fields on a record    |
| [SystemMetadata](/protocol/fields/metadata)  | System-managed metadata for records               |
| [Address](/protocol/fields/address)          | A physical address                                |
| [File](/protocol/fields/file)                | A file attachment                                 |
| [Name](/protocol/fields/name)                | A person's name                                   |
| [Phone](/protocol/fields/phone)              | A phone number                                    |
| [PCS term](/protocol/fields/pcs)             | A Philanthropy Classification System (PCS) term   |

#### Opportunity models

The CommonGrants protocol defines the following models that are specific to funding opportunities:

| Model                                                           | Description                                            |
| --------------------------------------------------------------- | ------------------------------------------------------ |
| [OpportunityBase](/protocol/models/opportunity#opportunitybase) | The core model for a funding opportunity               |
| [OppStatus](/protocol/models/opportunity#oppstatus)             | The status of an opportunity                           |
| [OppFunding](/protocol/models/opportunity#oppfunding)           | Details about the funding available for an opportunity |
| [OppTimeline](/protocol/models/opportunity#opptimeline)         | Key dates in the opportunity's timeline                |

#### Apply models

The CommonGrants protocol defines the following models that are specific to the application process:

**Application models**

| Model                                                             | Description                                        |
| ----------------------------------------------------------------- | -------------------------------------------------- |
| [ApplicationBase](/protocol/models/application#applicationbase)   | The core model for an application to a competition |
| [AppStatus](/protocol/models/application#appstatus)               | The status of an application                       |
| [AppStatusOptions](/protocol/models/application#appstatusoptions) | The set of values accepted for application status  |
| [AppFormResponse](/protocol/models/application#appformresponse)   | A form response included in an application         |

**Competition models**

| Model                                                                             | Description                                       |
| --------------------------------------------------------------------------------- | ------------------------------------------------- |
| [CompetitionBase](/protocol/models/competition#competitionbase)                   | The core model for a competition                  |
| [CompetitionStatus](/protocol/models/competition#competitionstatus)               | The status of a competition                       |
| [CompetitionStatusOptions](/protocol/models/competition#competitionstatusoptions) | The set of values accepted for competition status |
| [CompetitionForms](/protocol/models/competition#competitionforms)                 | The forms required for a competition              |
| [CompetitionTimeline](/protocol/models/competition#competitiontimeline)           | Key dates in the competition's timeline           |

**Form models**

| Model                                                  | Description                                        |
| ------------------------------------------------------ | -------------------------------------------------- |
| [FormBase](/protocol/models/form#formbase)             | A form for collecting data from a user             |
| [FormJsonSchema](/protocol/models/form#formjsonschema) | A JSON schema used to validate form responses      |
| [FormUISchema](/protocol/models/form#formuischema)     | A UI schema used to render the form in the browser |

**Form response models**

| Model                                                                                 | Description                                         |
| ------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [FormResponseBase](/protocol/models/form-response#formresponsebase)                   | The core model for a form response                  |
| [FormResponseStatus](/protocol/models/form-response#formresponsestatus)               | The status of a form response                       |
| [FormResponseStatusOptions](/protocol/models/form-response#formresponsestatusoptions) | The set of values accepted for form response status |

**Mapping models**

| Model                                                                       | Description                                           |
| --------------------------------------------------------------------------- | ----------------------------------------------------- |
| [MappingSchema](/protocol/models/mapping#mappingschema)                     | A mapping format for translating data between schemas |
| [MappingFunction](/protocol/models/mapping#mappingfunction)                 | The set of supported mapping functions                |
| [MappingConstantFunction](/protocol/models/mapping#mappingconstantfunction) | Returns a constant value                              |
| [MappingFieldFunction](/protocol/models/mapping#mappingfieldfunction)       | Returns the value of a field in the source data       |
| [MappingSwitchFunction](/protocol/models/mapping#mappingswitchfunction)     | Returns a new value based on a switch statement       |

**Applicant type models**

| Model                                                                        | Description                                         |
| ---------------------------------------------------------------------------- | --------------------------------------------------- |
| [ApplicantType](/protocol/models/applicant-type#applicanttype)               | The type of applicant eligible to apply for funding |
| [ApplicantTypeOptions](/protocol/models/applicant-type#applicanttypeoptions) | The set of possible applicant types                 |

### Routes and operations

The CommonGrants protocol defines the following routes and operations that are specific to funding opportunities and the application process.

:::note
While omitted for brevity in the following table, all protocol-defined routes MUST be prefixed with `/common-grants/`. View the full [OpenAPI docs](/protocol/api-docs) for more details about each route.
:::

#### Opportunity routes

| Route                        | Status   | Description                                                      |
| ---------------------------- | -------- | ---------------------------------------------------------------- |
| `GET /opportunities`         | Required | Get a paginated list of opportunities sorted by `lastModifiedAt` |
| `GET /opportunities/{oppId}` | Required | View details about a specific opportunity                        |
| `POST /opportunities/search` | Optional | Search and filter funding opportunities                          |

#### Award routes

| Route                 | Status   | Description                                               |
| --------------------- | -------- | --------------------------------------------------------- |
| `GET /awards`         | Optional | Get a paginated list of awards sorted by `lastModifiedAt` |
| `GET /awards/{awdId}` | Optional | View details about a specific award                       |
| `POST /awards/search` | Optional | Search and filter awards                                  |

The award routes were experimental in v0.4.0 and are optional as of v0.5.0, which means a CommonGrants API MAY implement them. They are optional rather than required because an implementation that publishes funding opportunities does not necessarily hold award data, and making the routes required would render those implementations non-compliant. Because they are no longer experimental, breaking changes to these routes now follow the versioning rules in [Versions](#versions) rather than the exemption that applies to experimental routes. See the [v0.5.0 migration notes](#v050) for what the change means when validating an implementation against a v0.4.0 base spec.

#### Version routes

| Route           | Status   | Description                                |
| --------------- | -------- | ------------------------------------------ |
| `GET /versions` | Optional | List the protocol versions this API serves |

The version discovery route was added in v0.6.0. It is optional, but a server that serves more than one protocol version MUST implement it. A route status can't express that condition, so the requirement lives in this text rather than in the route's status. See [Discovering supported versions](#discovering-supported-versions).

#### Organization routes

| Route                                  | Status       | Description                                                |
| -------------------------------------- | ------------ | ---------------------------------------------------------- |
| `GET /orgs`                            | Experimental | Get a paginated list of organization profiles              |
| `GET /orgs/{orgId}`                    | Experimental | View a specific organization profile                       |
| `PATCH /orgs/{orgId}`                  | Experimental | Update an organization profile                             |
| `POST /orgs/{orgId}/changes`           | Experimental | Submit a change to an organization profile                 |
| `GET /orgs/{orgId}/changes`            | Experimental | Get a paginated list of changes to an organization profile |
| `GET /orgs/{orgId}/changes/{changeId}` | Experimental | View a specific change to an organization profile          |

#### Competition routes

| Route                        | Status       | Description                               |
| ---------------------------- | ------------ | ----------------------------------------- |
| `GET /competitions/{compId}` | Experimental | View details about a specific competition |

#### Application routes

| Route                                      | Status       | Description                                     |
| ------------------------------------------ | ------------ | ----------------------------------------------- |
| `POST /applications/start`                 | Experimental | Start a new application for a given competition |
| `GET /applications/{appId}`                | Experimental | View an application for a given competition     |
| `PUT /applications/{appId}/submit`         | Experimental | Submit an application to a competition          |
| `PUT /applications/{appId}/forms/{formId}` | Experimental | Respond to a form in an application             |
| `GET /applications/{appId}/forms/{formId}` | Experimental | View form responses in an application           |

#### Form routes

| Route                 | Status       | Description                                              |
| --------------------- | ------------ | -------------------------------------------------------- |
| `GET /forms`          | Experimental | Get a paginated list of forms sorted by `lastModifiedAt` |
| `GET /forms/{formId}` | Experimental | View details about a specific form                       |

#### Pagination

CommonGrants routes that return multiple records from a resource SHOULD support pagination. Paginated routes SHOULD accept the following, either as query parameters (for `GET` routes) or as properties in a `pagination` object at the root of the request body (for `POST` and `PUT` routes):

| Parameter  | Type    | Default | Description                                       |
| ---------- | ------- | ------- | ------------------------------------------------- |
| `page`     | integer | 1       | The page number to return, starting at 1          |
| `pageSize` | integer | 100     | The number of results per page, between 1 and 100 |

Additionally, the response body for paginated requests SHOULD include a `paginationInfo` property with the following:

| Property     | Type    | Required | Description                                  |
| ------------ | ------- | -------- | -------------------------------------------- |
| `page`       | integer | Yes      | The page number of the results               |
| `pageSize`   | integer | Yes      | The number of results per page               |
| `totalItems` | integer | Yes      | The total number of results across all pages |
| `totalPages` | integer | Yes      | The total number of pages of results         |

The response body for paginated requests SHOULD return the paginated set of records in the `items` property.

#### Sorting

CommonGrants routes that support sorting SHOULD accept the following, either as query parameters (for `GET` routes) or as an properties in a `sorting` parameter in the request body (for `POST` and `PUT` routes):

| Parameter      | Type            | Description                                            |
| -------------- | --------------- | ------------------------------------------------------ |
| `sortBy`       | string          | The property to use to sort the results                |
| `customSortBy` | string          | The _implementation-defined_ sort value, if applicable |
| `sortOrder`    | `asc` or `desc` | The order in which to sort the results                 |

Additionally, the response body for sorted requests SHOULD include a `sortInfo` property with the following:

| Property       | Type            | Required | Description                                                                  |
| -------------- | --------------- | -------- | ---------------------------------------------------------------------------- |
| `sortBy`       | string          | Yes      | The property used to sort the results, or `custom` if a custom sort was used |
| `customSortBy` | string          | No       | The custom sort value used, if applicable                                    |
| `sortOrder`    | `asc` or `desc` | Yes      | The order in which the results were sorted                                   |
| `errors`       | array           | No       | Errors that occurred while sorting                                           |

If the protocol specifies a minimum set of `sortBy` options, implementations MUST support them. APIs MAY support additional _implementation-defined_ options using the `customSortBy` parameter.

To maintain compatibility, if a client uses an unsupported `customSortBy` value, the API SHOULD NOT return a non-2xx response. Instead, it SHOULD default to the standard `sortBy` value and note the error in `sortInfo.errors`.

#### Filtering

CommonGrants routes that support filtering SHOULD be paginated POST operations that accept a `filters` parameter at the root of the request body, with one or more supported filters defined by the protocol.

The value of each protocol-defined filter SHOULD conform to the `Filter` schema, which contains the following properties:

| Property   | Type | Required | Description                              |
| ---------- | ---- | -------- | ---------------------------------------- |
| `operator` | enum | Yes      | The operation to perform on the value    |
| `value`    | any  | Yes      | The data to use for the filter operation |

The `operator` property SHOULD be one of the following, though individual filters are NOT REQUIRED to support all operations:

| Operation  | Description              | Supported `value` types                      |
| ---------- | ------------------------ | -------------------------------------------- |
| `eq`       | Equal to                 | string, number, boolean, date, money         |
| `neq`      | Not equal to             | string, number, boolean, date, money         |
| `gt`       | Greater than             | number, date, money                          |
| `gte`      | Greater than or equal to | number, date, money                          |
| `lt`       | Less than                | number, date, money                          |
| `lte`      | Less than or equal to    | number, date, money                          |
| `like`     | String contains          | string                                       |
| `not_like` | String does not contain  | string                                       |
| `in`       | In list                  | array                                        |
| `not_in`   | Not in list              | array                                        |
| `between`  | Between two values       | range object with `min` and `max` properties |

Additionally, the response body for filtered requests SHOULD return the filtered set of records in the `items` property of a [paginated response](#pagination). This response body SHOULD also include a `filterInfo` property with the following:

| Property  | Type   | Required | Description                                |
| --------- | ------ | -------- | ------------------------------------------ |
| `filters` | object | Yes      | The `filters` object from the request body |
| `errors`  | array  | No       | Errors that occurred while filtering       |

As an example, the `POST /opportunities/search` route may define the following schema for its `filters` request body parameter:

```yaml
id: OpportunitySearchFilters.yaml
filters:
  type: object
  properties:
    title:
      description: Filter opportunities by title
      type: object
      properties:
        value:
          type: string
        operation:
          type: string
          enum:
            - eq
            - neq
            - like
    closedDateRange:
      description: Filter opportunities closed between two dates
      type: object
      properties:
        value:
          type: object
          properties:
            min:
              type: string
              format: date
            max:
              type: string
              format: date
        operation:
          type: string
          enum:
            - eq
            - neq
            - gt
            - gte
            - lt
            - lte
          required:
            - operation
```

Which would accept the following request body:

```json
{
  "filters": {
    "title": {
      "value": "example",
      "operation": "like"
    },
    "closedDateRange": {
      "value": {
        "min": "2024-01-01",
        "max": "2024-01-31"
      },
      "operation": "between"
    }
  }
}
```

And return the following response body:

```json
{
  "items": [
    // filtered results
  ],
  "paginationInfo": {
    // pagination info
  },
  "filterInfo": {
    "filters": {
      "title": {
        "value": "example",
        "operation": "like"
      },
      "closedDateRange": {
        "value": {
          "min": "2024-01-01",
          "max": "2024-01-31"
        },
        "operation": "between"
      }
    },
    "errors": []
  }
}
```

For more information about implementation-defined filters, see the [Custom filters](#custom-filters) section.

### Extensions

The CommonGrants protocol defines the following mechanisms for extending the base protocol with _implementation-defined_ behavior:

#### Custom fields

CommonGrants APIs may need to support attributes that are not explicitly included in the default schemas. To support this, the CommonGrants protocol has defined a pattern for adding custom fields to certain models, e.g. `OpportunityBase`.

If a model supports custom fields, it MUST include an optional `customFields` property, an object whose values MUST conform to the `CustomField` type. CommonGrants APIs MAY use this `customFields` property to define custom fields for its implementation of that model.

For example, to maintain compatibility with existing systems, a CommonGrants API might need each Opportunity record to have an `id` field that is an integer instead of a `uuid`. This API can create an _implementation-defined_ version of the `OpportunityBase` schema with the following:

```yaml {16-37}
type: object
properties:
  id:
    type: string
    examples:
      - 30a12e5e-5940-4c08-921c-17a8960fcf4b
    format: uuid
    description: Globally unique id for the opportunity
  title:
    type: string
    description: Title or name of the funding opportunity
  # other fields omitted for brevity
  customFields:
    type: object
    properties:
      legacyId:
        type: object
            properties:
            name:
                type: string
                const: Legacy ID
            type:
                type: string
                const: number
            value:
                type: integer
                examples:
                  - 12345
            description:
                type: string
                const: An integer ID for the opportunity, needed for compatibility with legacy systems
            required:
              - name
              - type
              - value
    required:
      - legacyId
required:
  - id
  # other required fields omitted for brevity
  - customFields
```

In this example, the API extends the OpportunityBase model to include a `legacyId` custom field, defined using the `CustomField` type.

_Implementation-defined_ extensions MAY make the `customFields` property required if the base schema includes it as optional, but SHALL NOT add a `customFields` property to a model that lacks one.

Similarly, APIs SHALL NOT add fields outside the `customFields` property. If a model lacks a `customFields` property, it doesn't support extension through custom fields.

#### Custom enum values

Some CommonGrants schemas have fields that accept values from a limited set of options, known as "enums". Occasionally, APIs need to set these fields to _implementation-defined_ custom values.

To support this, the protocol defines a pattern for custom enum values. If a field supports custom enum values, it MUST match an object with these properties:

- `value`: a required string that includes `custom` as one of its enum values
- `customValue`: an optional string with the display value for the custom enum
- `description`: an optional string that describes how to interpret the custom enum

```yaml
properties:
  value:
    type: string
    enum:
      # other enum values added here
      - custom
  customValue:
    type: string
    description: The display value for the custom enum
  description:
    type: string
    description: A human-readable description of the value
required:
  - value
```

For example, the `OpportunityBase` model includes a `status` with predefined values (e.g. `forecasted`, `closed`). When an opportunity's status is set to one of these predefined values, it MUST include the `value` property and SHOULD omit the `customValue` and `description` properties:

```json
{
  "id": "ad763210-5940-4c08-921c-17a8960fcf4b",
  "title": "Example Opportunity",
  // other OpportunityBase fields omitted for brevity
  "status": {
    "value": "forecasted"
  }
}
```

When set to a custom value, it SHOULD include `customValue` and `description`:

```json
{
  "id": "ad763210-5940-4c08-921c-17a8960fcf4b",
  "title": "Example Opportunity",
  // other OpportunityBase fields omitted for brevity
  "status": {
    "value": "custom",
    "customValue": "archived",
    "description": "Opportunity will no longer appear in search results, but will remain in the system for reporting purposes"
  }
}
```

CommonGrants APIs SHALL NOT add custom enum values to any field that does not support them in the base protocol.

#### Custom filters

If a route supports _implementation-defined_ filters, it MUST include a `customFilters` property in its `filters` request body parameter. This property must be an object whose values match the `Filter` schema described in the [Filtering](#filtering) section.

For example, to allow clients to filter opportunities by a custom field, an API can define this filter:

```yaml
id: OpportunityCustomFilter.yaml
filters:
  type: object
  # protocol-defined filters omitted for brevity
  customFilters:
    type: object
    properties:
      agency:
        description: Filter opportunities by a list of agencies
        type: object
        properties:
          value:
            type: array
            items:
              type: string
          operation:
            type: string
            enum:
              - in
              - not_in
```

For compatibility, if a client provides an unsupported custom filter, the API SHOULD NOT return a non-2xx response. Instead, it SHOULD exclude that filter and note the error in `filterInfo.errors`.

For example, if a client provides an unsupported `agencyType` filter, the API SHOULD exclude it and return the following response body:

```json
{
  "filterInfo": {
    "filters": {
      "agencyType": {
        "value": ["federal"],
        "operation": "in"
      }
    },
    "errors": ["Unsupported filter: agencyType"]
  }
}
```

#### Custom routes

CommonGrants APIs MAY define custom routes that are not part of the core protocol. Any path that is **_not_** prefixed with `/common-grants/` is considered a custom route.

For example, to allow clients to access the history of an opportunity record, an API can define this route:

```yaml
/opportunities/{opportunityId}/history/:
  get:
    summary: Get opportunity history
    description: Get the history of changes made to an opportunity
```

This pattern can also be used to maintain support for existing routes that conflict with those defined by the protocol. For example, an API can maintain a non-conforming `GET /common-grants/opportunities` route by defining their own `GET /opportunities` route (without the `/common-grants` prefix):

```yaml
/opportunities/:
  get:
    summary: Get opportunities (legacy)
    description: Get a list of opportunities, with legacy filtering and sorting
```

This allows APIs to incrementally adopt the CommonGrants protocol while supporting existing routes and operations.

## Appendix A: Non-compliant examples

This appendix contains examples of changes to a CommonGrants API document that are non-compliant with the protocol.

#### Extra routes

The implementation includes an extra route that is prefixed with `/common-grants/`, but is not part of the base protocol.

<details>
<summary>Base protocol</summary>

```yaml
openapi: 3.0.0
info:
  title: CommonGrants Base API
  description: Base protocol specification to check a CommonGrants API against
tags:
  - name: Opportunities
  - name: required
paths:
  /common-grants/opportunities:
    get:
      # omitted for brevity
      tags:
        - name: Opportunities
        - name: required
```

</details>

<details>
<summary>Implementation with extra route</summary>

```yaml {9-12}
openapi: 3.0.0
info:
  title: CommonGrants implementation API
  description: Implementation of the CommonGrants protocol
tags:
  - name: Opportunities
paths:
  /common-grants/opportunities:
    post:
      # omitted for brevity
      tags:
        - name: Opportunities
    get:
      # omitted for brevity
      tags:
        - name: Opportunities
```

</details>

#### Missing routes

The implementation does not include a required route.

<details>
<summary>Base protocol</summary>

```yaml
openapi: 3.0.0
info:
  title: CommonGrants Base API
  description: Base protocol specification to check a CommonGrants API against
tags:
  - name: Opportunities
  - name: required
paths:
  /common-grants/opportunities:
    get:
      # omitted for brevity
      tags:
        - name: Opportunities
        - name: required
  /common-grants/opportunities/{id}:
    get:
      # omitted for brevity
      tags:
        - name: Opportunities
        - name: required
```

</details>

<details>
<summary>Implementation with missing route</summary>

```yaml {13}
openapi: 3.0.0
info:
  title: CommonGrants implementation API
  description: Implementation of the CommonGrants protocol
tags:
  - name: Opportunities
paths:
  /common-grants/opportunities:
    get:
      # omitted for brevity
      tags:
        - name: Opportunities
  # missing GET /opportunities/{id} route
```

</details>

#### Mismatched schemas

The implementation schemas are not valid against the base protocol schemas in one of the following ways:

- The implementation schema misses a required field.
- The implementation schema includes additional properties at the root of the schema.
- The implementation schema assigns the wrong type to an existing field.
- The implementation schema adds to the list of enum values for an existing field.

<details>
<summary>Base protocol</summary>

```yaml
openapi: 3.0.0
info:
  title: CommonGrants Base API
  description: Base protocol specification to check a CommonGrants API against
tags:
  - name: Opportunities
  - name: required
paths:
  /common-grants/opportunities:
    get:
      # omitted for brevity
      tags:
        - name: Opportunities
        - name: required
      responses:
        "200":
          description: A 200 response with a paginated list of items
          content:
            application/json:
              schema:
                type: object
                required:
                  - id
                  - title
                properties:
                  id:
                    type: string
                    format: uuid
                  title:
                    type: string
                  status:
                    type: string
                    enum:
                      - forecasted
                      - open
                      - closed
                      - custom
                # other OpportunityBase fields omitted for brevity
```

</details>

<details>
<summary>Implementation with mismatched schemas</summary>

```yaml {25-27, 33, 38}
openapi: 3.0.0
info:
  title: CommonGrants implementation API
  description: Implementation of the CommonGrants protocol
tags:
  - name: Opportunities
paths:
  /common-grants/opportunities:
    get:
      # omitted for brevity
      tags:
        - name: Opportunities
        - name: required
      responses:
        "200":
          description: A 200 response with a paginated list of items
          content:
            application/json:
              schema:
                type: object
                required:
                  - id
                  - title
                properties:
                  id:
                    type: integer # wrong type
                  # missing title field
                  agency:
                    type: string
                  status:
                    type: string
                    enum:
                      # adds an unsupported enum value "archived"
                      - forecasted
                      - open
                      - closed
                      - custom
                      - archived
                  # other OpportunityBase fields omitted for brevity
```

</details>
