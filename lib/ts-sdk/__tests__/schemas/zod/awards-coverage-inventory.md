# Award contract coverage inventory (#1156)

Every reference reachable from `AwardBase` and the three award routes
(`GET /awards/`, `GET /awards/{awdId}`, `POST /awards/search`), derived from the
regenerated bundle at `tsp-output/@typespec/json-schema/schemas.yaml`.

Regenerate before trusting this file:

```
pnpm --filter @common-grants/core run build
pnpm --filter @common-grants/sdk run typespec
```

Each row is classified so the award tickets know what already exists, what each
ticket must newly export, which shapes are inline or record wrappers with no
`$id` of their own, and which parity gaps are owned elsewhere.

**Status legend**

- `existing`: already exported from `src/schemas/zod` and reusable as-is.
- `new (T#)`: a public schema the named ticket introduces.
- `inline` / `record`: has no standalone emitted `$id`; it is an inline object
  or an emitter-generated record wrapper that maps onto its owning property.
- `unresolved`: a shared-schema divergence that blocks parity and is owned by
  another issue; see the bottom section.

## Object policy in the bundle

The emitted award schemas seal objects with `unevaluatedProperties: { not: {} }`
at **every** level (outer object, nested `registry`, each `allIds` entry), and
model open maps with `unevaluatedProperties: { $ref: <Value>.yaml }` (an
emitter-generated `Record<...>` wrapper). The parity harness forces root
`.strict()` by default, which both overrides a caller's catch-all and never
reaches nested objects. Award tests therefore compose closure/openness into the
Zod schema themselves and call the harness with `preserveObjectPolicy: true`
(added in #1156-T0). See `__tests__/utils/fuzz-test.spec.ts` →
`describe("object policy preservation")`.

## `AwardBase` and reachable references

| Emitted `$id`                 | Reached from                                                             | SDK schema                     | Status        | Shape notes                                                                               |
| ----------------------------- | ------------------------------------------------------------------------ | ------------------------------ | ------------- | ----------------------------------------------------------------------------------------- |
| `AwardBase.yaml`              | root model                                                               | `AwardBaseSchema` / `Award`    | new (T4)      | 6 required: `id`, `title`, `description`, `status`, `createdAt`, `lastModifiedAt`; sealed |
| `uuid.yaml`                   | `id`, `AwdRef.id`, `*.id`                                                | `UuidSchema`                   | existing      | format `uuid`                                                                             |
| `AwdStatus.yaml`              | `status`                                                                 | `AwdStatusSchema`              | new (T4)      | `ExtensibleEnumT<AwdStatusOptions>`; sealed                                               |
| `AwdStatusOptions.yaml`       | `AwdStatus.value`                                                        | `AwdStatusOptionsEnum`         | new (T4)      | enum `awarded`/`completed`/`cancelled`/`custom`                                           |
| `AwdFunding.yaml`             | `funding`                                                                | `AwdFundingSchema`             | new (T4)      | all optional; sealed                                                                      |
| `Money.yaml`                  | `AwdFunding.{requested,awarded,disbursed}`                               | `MoneySchema`                  | existing      | sealed; `amount` is `decimalString`                                                       |
| `decimalString.yaml`          | `Money.amount`                                                           | `DecimalStringSchema`          | existing      | pattern `^-?[0-9]+\.?[0-9]*$`                                                             |
| `AwdTimeline.yaml`            | `keyDates`                                                               | `AwdTimelineSchema`            | new (T4)      | `awardDate`/`periodOfPerformance` events + `otherDates` record                            |
| `Event.yaml`                  | `AwdTimeline.awardDate` etc.                                             | `EventSchema`                  | existing (\*) | `anyOf` of the three variants                                                             |
| `SingleDateEvent.yaml`        | `Event`                                                                  | `SingleDateEventSchema`        | existing (\*) | sealed in bundle; SDK not sealed, see unresolved                                          |
| `DateRangeEvent.yaml`         | `Event`                                                                  | `DateRangeEventSchema`         | existing (\*) | sealed in bundle; SDK not sealed, see unresolved                                          |
| `OtherEvent.yaml`             | `Event`                                                                  | `OtherEventSchema`             | existing (\*) | sealed in bundle; SDK not sealed, see unresolved                                          |
| `EventType.yaml`              | `EventBase.eventType`                                                    | `EventTypeEnum`                | existing      | enum                                                                                      |
| `isoDate.yaml`                | event `date`/`startDate`/`endDate`                                       | `ISODateSchema`                | existing      | format `date`                                                                             |
| `isoTime.yaml`                | event `time`/`startTime`/`endTime`                                       | `ISOTimeSchema`                | existing      | format `time`                                                                             |
| `OppRef.yaml`                 | `opportunity`                                                            | `OppRefSchema`                 | new (T3)      | requires `id`+`title`; sealed                                                             |
| `OppIds.yaml`                 | `OppRef.identifiers`                                                     | `OppIdsSchema`                 | new (T3)      | `IdentifierCollection` + `opp:us:fon`/`opp:us:aln`; sealed                                |
| `OppIdFon.yaml`               | `OppIds`                                                                 | `OppIdFonSchema`               | new (T3)      | specialized identifier, `registry.code` const `opp:us:fon`                                |
| `OppIdAln.yaml`               | `OppIds`                                                                 | `OppIdAlnSchema`               | new (T3)      | specialized identifier, `registry.code` const `opp:us:aln`                                |
| `AppRef.yaml`                 | `application`                                                            | `AppRefSchema`                 | new (T1)      | requires `id`+`title`; sealed                                                             |
| `OrgRefCollection.yaml`       | `funders`, `recipientOrganizations`                                      | `OrgRefCollectionSchema`       | new (T2)      | requires `primary`; `otherOrgs` record; sealed                                            |
| `OrgRef.yaml`                 | `OrgRefCollection.primary`/`otherOrgs`                                   | `OrgRefSchema`                 | new (T2)      | requires `id`+`name`; sealed                                                              |
| `OrgIds.yaml`                 | `OrgRef.identifiers`                                                     | `OrgIdsSchema`                 | new (T2)      | `IdentifierCollection` + ein/uei/duns; sealed                                             |
| `OrgIdEin.yaml`               | `OrgIds`                                                                 | `OrgIdEinSchema`               | new (T2)      | `id` is `employerTaxId`; `registry.code` const `org:us:ein`                               |
| `OrgIdUei.yaml`               | `OrgIds`                                                                 | `OrgIdUeiSchema`               | new (T2)      | `id` is `samUEI`; `registry.code` const `org:us:uei`                                      |
| `OrgIdDuns.yaml`              | `OrgIds`                                                                 | `OrgIdDunsSchema`              | new (T2)      | `id` is `duns`; `registry.code` const `org:xi:duns`                                       |
| `employerTaxId.yaml`          | `OrgIdEin.id`/`allIds[].id`                                              | `EmployerTaxIdSchema`          | new (T2)      | pattern `^[0-9]{9}$`                                                                      |
| `samUEI.yaml`                 | `OrgIdUei.id`/`allIds[].id`                                              | `SamUeiSchema`                 | new (T2)      | pattern `^[A-HJ-NP-Z0-9]{12}$` (no I/O)                                                   |
| `duns.yaml`                   | `OrgIdDuns.id`/`allIds[].id`                                             | `DunsSchema`                   | new (T2)      | pattern `^[0-9]{9}$`                                                                      |
| `AwdRecipientIndividual.yaml` | `recipientIndividual`                                                    | `AwdRecipientIndividualSchema` | new (T4)      | `customFields` at this supported nested location; sealed; extension-registered            |
| `Name.yaml`                   | `AwdRecipientIndividual.name`                                            | `NameSchema`                   | new (T1)      | requires `firstName`+`lastName`; sealed                                                   |
| `CustomField.yaml`            | `AwdRecipientIndividual.customFields[*]`                                 | `CustomFieldSchema`            | existing (\*) | sealed in bundle; SDK not sealed, see unresolved                                          |
| `CustomFieldType.yaml`        | `CustomField.fieldType`                                                  | `CustomFieldTypeEnum`          | existing      | enum                                                                                      |
| `AwdRef.yaml`                 | `parent`, and spread into `AwardBase`                                    | `AwdRefSchema`                 | new (T4)      | requires `id`+`title`; sealed                                                             |
| `AwdIds.yaml`                 | `AwdRef.identifiers`/`AwardBase.identifiers`                             | `AwdIdsSchema`                 | new (T4)      | `IdentifierCollection` + `awd:us:fain`; sealed                                            |
| `AwdIdFain.yaml`              | `AwdIds`                                                                 | `AwdIdFainSchema`              | new (T4)      | string identifier, `registry.code` const `awd:us:fain`                                    |
| `IdentifierCollection.yaml`   | base of `AwdIds`/`OrgIds`/`OppIds`; `AwdRecipientIndividual.identifiers` | `IdentifierCollectionSchema`   | new (T1)      | `systemId` + `otherIds` record; **not** sealed (extensible)                               |
| `SystemId.yaml`               | `IdentifierCollection.systemId`                                          | `SystemIdSchema`               | new (T1)      | `id`/`allIds[].id` are `uuid`; sealed; nested `registry` sealed                           |
| `Identifier.yaml`             | `IdentifierCollection.otherIds[*]`                                       | `IdentifierSchema`             | new (T1)      | generic string identifier; sealed; nested `registry`/`allIds` sealed                      |
| `IdentifierStatus.yaml`       | `*.allIds[].status`                                                      | `IdentifierStatusEnum`         | new (T1)      | enum `active`/`archived`; constant `IdentifierStatus`                                     |
| `SystemMetadata.yaml`         | spread into `AwardBase`                                                  | `SystemMetadataSchema`         | existing      | `createdAt`/`lastModifiedAt`, format `date-time`                                          |

(\*) Reusable but carries a shared-schema divergence, see **Unresolved
shared-schema dependencies**.

## Inline and record shapes (no standalone `$id`)

| Shape                 | Appears in                                                  | Maps to                               |
| --------------------- | ----------------------------------------------------------- | ------------------------------------- |
| `registry` object     | every `Identifier*`/`SystemId`/`Org/Opp/AwdId*`             | inline sealed object: `code` + `url?` |
| `allIds[]` entry      | `Identifier`/`SystemId`/`OrgId*`                            | inline sealed object: `id` + `status` |
| `RecordIdentifier`    | `IdentifierCollection.otherIds`                             | open record of `Identifier`           |
| `RecordCustomField`   | `AwdRecipientIndividual.customFields`                       | open record of `CustomField`          |
| `RecordOrgRef`        | `OrgRefCollection.otherOrgs`                                | open record of `OrgRef`               |
| `otherDates`          | `AwdTimeline.otherDates`                                    | open record of `Event`                |
| `RecordDefaultFilter` | `AwdDefaultFilters` (catch-all), `AwdFilters.customFilters` | open record of `DefaultFilter`        |

## Award routes

| Emitted `$id`                 | Route or role                         | SDK schema                     | Status   |
| ----------------------------- | ------------------------------------- | ------------------------------ | -------- |
| `AwardsListRequest.yaml`      | `GET /awards/` query                  | `AwardsListRequestSchema`      | new (T6) |
| `AwardGetRequest.yaml`        | `GET /awards/{awdId}` path            | `AwardGetRequestSchema`        | new (T6) |
| `AwdSearchRequest.yaml`       | `POST /awards/search` body            | `AwdSearchRequestSchema`       | new (T6) |
| `AwardResponse.yaml`          | successful read response              | `AwardResponseSchema`          | new (T6) |
| `AwardsListResponse.yaml`     | successful paginated list response    | `AwardsListResponseSchema`     | new (T6) |
| `AwardsSortedResponse.yaml`   | paginated award response with sorting | `AwardsSortedResponseSchema`   | new (T6) |
| `AwardsFilteredResponse.yaml` | successful search response            | `AwardsFilteredResponseSchema` | new (T6) |

`AwardsListRequestSchema` maps the operation's `PaginatedQueryParams` to the
protocol-exact local `RoutePaginationInputSchema`. `AwardGetRequestSchema` maps
the `awdId` path parameter to `UuidSchema`. `AwdSearchRequestSchema` composes
`search?`, `AwdFiltersSchema`, `AwdSortingSchema`, and the protocol-exact local
pagination input corresponding to `PaginatedBodyParams`. See Unresolved below
for why the two shared pagination schemas cannot be reused yet. The read
operation's error contract uses the existing `NotFoundSchema`; the test entry
point emits only the seven concrete success/request contracts listed above.

### Award filter and sorting references

| Emitted `$id`            | Reached from                        | SDK schema                    | Status   |
| ------------------------ | ----------------------------------- | ----------------------------- | -------- |
| `AwdFilters.yaml`        | search `filters`                    | `AwdFiltersSchema`            | new (T5) |
| `AwdDefaultFilters.yaml` | base of `AwdFilters`                | `AwdDefaultFiltersSchema`     | new (T5) |
| `StringArrayFilter.yaml` | `status`, `opportunityId`           | `StringArrayFilterSchema`     | existing |
| `DateRangeFilter.yaml`   | `awardDateRange`                    | `DateRangeFilterSchema`       | existing |
| `MoneyRangeFilter.yaml`  | `awardedAmountRange`                | `MoneyRangeFilterSchema`      | existing |
| `DefaultFilter.yaml`     | custom/default filter record values | `DefaultFilterSchema`         | existing |
| `AwdSorting.yaml`        | search `sorting`                    | `AwdSortingSchema`            | new (T5) |
| `AwdSortBy.yaml`         | `AwdSorting.sortBy`                 | `AwdSortByEnum` / `AwdSortBy` | new (T5) |
| `SortBodyParams.yaml`    | base of `AwdSorting`                | `SortBodyParamsSchema`        | existing |

`AwdDefaultFilters` is open: it accepts additional `DefaultFilter`-valued keys
through its `RecordDefaultFilter` catch-all. `AwdFilters` is sealed except for
its explicit `customFilters` record; inheriting the base catch-all into it
would be wrong. Proving both requires `preserveObjectPolicy: true`.

The route response and request envelopes are concrete local schemas in
`award-routes.ts`, not the generic `Ok`/`Paginated`/`Sorted`/`Filtered`
response templates (`responses.ts`) or the shared `PaginatedQueryParamsSchema`/
`PaginatedBodyParamsSchema` (`pagination.ts`). Those generics reuse the shared
pagination and sorting schemas, which diverge from the protocol (see
Unresolved), so building on them would carry the divergence into the award
routes. The local copies pin `status: 200`, seal every level, bound page and
page size at int32, and drop `null` where the protocol is non-nullable; they
collapse back onto the generics once #1192 fixes the shared schemas. Parity is
asserted two-sided (Zod and AJV) against the emitted route schemas in
`award-routes.spec.ts`.

## Unresolved shared-schema dependencies

Each shared schema below diverges from its emitted contract. The first two
block zero-divergence parity for the award models that reuse them directly; the
rest are the pagination and sorting schemas the award routes cannot reuse and so
fork locally. All are isolated with self-expiring reproductions in
`__tests__/schemas/zod/shared-defects.spec.ts` and owned by
[#1192](https://github.com/HHS/simpler-grants-protocol/issues/1192) (shared
models), not #1156.

| Shared schema                                             | Divergence                                                                                        | Award impact                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `SingleDateEvent` / `DateRange` / `Other` (`EventSchema`) | optional metadata is `.nullish()` (accepts `null`); objects are not sealed (accept unknown keys)  | blocks `AwdTimeline` parity (T4)                  |
| `CustomField` (`CustomFieldSchema`)                       | `schema`/`description` are `.nullish()` (accept `null`); object not sealed (accepts unknown keys) | blocks `AwdRecipientIndividual.customFields` (T4) |
| `PaginatedQueryParams` / `PaginatedBodyParams`            | `page`/`pageSize` are `.nullish()` and unbounded (no int32 `.max()`); objects are not sealed      | forked as `RoutePaginationInputSchema` (T6)       |
| `PaginatedResultsInfo` (`PaginatedResultsInfoSchema`)     | `pageSize` allows `0` (protocol minimum is `1`); totals are `.nullish()`; object not sealed       | forked as `AwardPaginationInfoSchema` (T6)        |
| `SortedResultsInfo` (`SortedResultsInfoSchema`)           | `customSortBy`/`errors` are `.nullish()` (accept `null`); object not sealed                       | forked as `AwardSortInfoSchema` (T6)              |

Track any further UUID/URI/date-format or route-metadata differences the same
way as they are found during T4 through T6: isolate the reproduction, name the
owning issue, and do not mark an unexplained failure as an expected divergence.
