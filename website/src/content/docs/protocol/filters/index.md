---
title: Overview
description: Overview of the `CommonGrants.Filters` namespace.
sidebar:
  order: 0
---

The `CommonGrants.Filters` namespace contains a series of basic filters that can be used to define both standard and custom filtering within

## Filters

Learn more about the default filters supported by the CommonGrants protocol:

### Base filter and operators

| Filter                                                              | Description                                           |
| ------------------------------------------------------------------- | ----------------------------------------------------- |
| [EquivalenceOperators](/protocol/filters/base#equivalenceoperators) | Operators that filter a field based on an exact match |
| [ComparisonOperators](/protocol/filters/base#comparisonoperators)   | Operators that filter a field based on a comparison   |
| [ArrayOperators](/protocol/filters/base#arrayoperators)             | Operators that filter a field based on an array       |
| [StringOperators](/protocol/filters/base#stringoperators)           | Operators that filter a field based on a string       |
| [RangeOperators](/protocol/filters/base#rangeoperators)             | Operators that filter a field based on a range        |
| AllOperators                                                        | Combined set of all filter operators                  |

### String

| Filter                                                                    | Description                                         |
| ------------------------------------------------------------------------- | --------------------------------------------------- |
| [StringComparisonFilter](/protocol/filters/string#stringcomparisonfilter) | Filters by comparing a field to a string value      |
| [StringArrayFilter](/protocol/filters/string#stringarrayfilter)           | Filters by comparing a field to an array of strings |

### Numeric

| Filter                                                                     | Description                                                |
| -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [NumberComparisonFilter](/protocol/filters/numeric#numbercomparisonfilter) | Filters by comparing a field to a numeric value            |
| [NumberRangeFilter](/protocol/filters/numeric#numberrangefilter)           | Filters by comparing a field to a range of numeric values  |
| [NumberArrayFilter](/protocol/filters/numeric#numberarrayfilter)           | Filters by comparing a field to an array of numeric values |

### Money

| Filter                                                                 | Description                                                |
| ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| [MoneyComparisonFilter](/protocol/filters/money#moneycomparisonfilter) | Filters by comparing a field to a monetary value           |
| [MoneyRangeFilter](/protocol/filters/money#moneyrangefilter)           | Filters by comparing a field to a range of monetary values |

### Date and time

| Filter                                                              | Description                                                           |
| ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [DateComparisonFilter](/protocol/filters/date#datecomparisonfilter) | Filters by comparing a field to a date value                          |
| [DateRangeFilter](/protocol/filters/date#daterangefilter)           | Filters by comparing a field to a range of date values                |
| [isoTime](/protocol/types/date#isotime)                             | Time without timezone in ISO 8601 format (HH:mm:ss)                   |
| [isoDate](/protocol/types/date#isodate)                             | Calendar date in ISO 8601 format (YYYY-MM-DD)                         |
| [utcDateTime](/protocol/types/date#utcdatetime)                     | Datetime with UTC timezone in ISO 8601 format (YYYY-MM-DDThh:mm:ssZ)  |
| [offsetDateTime](/protocol/types/date#offsetdatetime)               | Datetime with timezone in ISO 8601 format (YYYY-MM-DDThh:mm:ss±hh:mm) |

### Other types

| Filter                                   | Description                     |
| ---------------------------------------- | ------------------------------- |
| [boolean](/protocol/types/other#boolean) | A true or false value           |
| [array](/protocol/types/other#array)     | An ordered list of values       |
| [record](/protocol/types/other#record)   | A collection of key-value pairs |
| [null](/protocol/types/other#null)       | A null value                    |
| [unknown](/protocol/types/other#unknown) | A value of with any type        |

## Usage

You can use the types listed above to define custom models in your TypeSpec project.

```typespec
import "@common-grants/core"

// Exposes the `Types` namespace so that it can be accessed
// without a `CommonGrants` prefix
using CommonGrants;

model MyModel {
  id: Types.uuid; // CommonGrants-defined type
  description: string; // Standard TypeSpec type
  tags: Array<string>; // A templated type
  createdAt: utcDateTime;
}
```
