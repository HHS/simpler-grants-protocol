---
"@common-grants/core": minor
---

Add an `ExtensibleEnum` base model and `ExtensibleEnumT<T>` templated model to the core
fields library (#961), formalizing the extensible enum pattern (a `value` from a predefined
set of options, plus optional `customValue` and `description`). Every extensible enum field —
`OppStatus`, `AppStatus`, `ApplicantType`, `FormResponseStatus`, `CompetitionStatus`, and the
0.4.0 additions `AwdStatus` and `RevisionStatus` — is now defined via `ExtensibleEnumT`, so the
pattern has a single source of truth. Also adds the previously missing `custom` option to
`FormResponseStatusOptions` at protocol version 0.4.0. Emitted schema shapes are unchanged
apart from property description wording.
