---
title: Overview
description: Overview of the `CommonGrants.Types` namespace.
sidebar:
  order: 0
---

The `CommonGrants.Types` namespace contains types that are used throughout the protocol.

## Types

Learn more about the base data types supported by the CommonGrants protocol:

### String

| Type                                                            | Description                      |
| --------------------------------------------------------------- | -------------------------------- |
| [string](/protocol/types/string#string) | A sequence of characters         |
| [uuid](/protocol/types/string#uuid)     | A universally unique identifier  |
| [url](/protocol/types/string#url)       | A Uniform Resource Locator (URL) |

### Numeric

| Type                                                                           | Description                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------ |
| [numeric](/protocol/types/numeric#numeric)             | A number with an arbitrary precision and scale         |
| [integer](/protocol/types/numeric#integer)             | A whole number without decimals                        |
| [decimalString](/protocol/types/numeric#decimalstring) | A decimal number encoded as a string to preserve scale |

### Date and time

| Type                                                                          | Description                                                           |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [isoTime](/protocol/types/date#isotime)               | Time without timezone in ISO 8601 format (HH:mm:ss)                   |
| [isoDate](/protocol/types/date#isodate)               | Calendar date in ISO 8601 format (YYYY-MM-DD)                         |
| [utcDateTime](/protocol/types/date#utcdatetime)       | Datetime with UTC timezone in ISO 8601 format (YYYY-MM-DDThh:mm:ssZ)  |
| [offsetDateTime](/protocol/types/date#offsetdatetime) | Datetime with timezone in ISO 8601 format (YYYY-MM-DDThh:mm:ss±hh:mm) |

### Other types

| Type                                                             | Description                     |
| ---------------------------------------------------------------- | ------------------------------- |
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
