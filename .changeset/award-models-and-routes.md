---
"@common-grants/core": minor
---

Add an `AwardBase` model and award routes to the core library (#954).

`AwardBase` tracks the funder, recipient, and financial details of a grant award,
with references to the source opportunity and application, and support for both
organization and individual recipients. It is accompanied by the `AwdStatus`,
`AwdFunding`, `AwdTimeline`, `AwdIds`, `AwdRef`, `AwdRecipientIndividual`, and
`AwdRecipientType` sub-models, plus `AwdFilters`/`AwdSorting` for search. New
experimental routes are added: `GET /common-grants/awards/`,
`POST /common-grants/awards/search`, and `GET /common-grants/awards/{awdId}`.

Introduces lightweight reference forms for the models an award points at:
`OppRef`, `AppRef`, and `OrgRef` (plus `OrgRefCollection`). Each
reference carries the identity fields of its base model and is spread into that
base (like `SystemMetadata`), so the base and its reference form stay in sync and
reference-field changes surface in the base model's changelog.

Also renames `ApplicationBase.name` to `title` (versioned via `@renamedFrom`) so
it aligns with `AppRef`. All changes are added at protocol version 0.4.0.
