---
"@common-grants/core": minor
---

Add identifier models to the core library (#957).

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
