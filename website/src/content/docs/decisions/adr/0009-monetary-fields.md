---
title: Monetary fields
description: ADR documenting the decision to follow PayPal's format for representing monetary values.
---

## Summary

### Problem statement

We need to choose a format for representing monetary values that balances precision, readability, and flexibility.

### Decision outcome

We decided to represent monetary values using decimal string representation for the `amount` and an ISO 4217-compliant `currencyCode` field to indicate the denomination. This format is also used by PayPal, ApplePay, Google Wallet and other well known APIs that support monetary transactions.

Here's an example of that format:

```json
{
  "amount": "100.50",
  "currencyCode": "USD"
}
```

- **Positive consequences**
  - **Easy to understand:** A decimal string (e.g., `"1234.56"`) is intuitive and aligns with the way monetary values are commonly displayed, reducing the cognitive load for developers and users.
  - **Requires less documentation:** The format is immediately interpretable without requiring documentation or explanation of smallest-unit conventions, making the protocol more user-friendly and self-contained.
  - **Flexibility:** More easily supports currencies with non-standard subunits or use cases in which we’d like to support sub-cent precision (e.g. `1234.567` for `USD`).
- **Negative consequences**
  - **Requires validation:** Decimal strings require validation within a given implementation to prevent incorrect formats (e.g., more than two decimal places for USD).
  - **Performance considerations:** Parsing string representations into numeric types may introduce performance overhead in high-volume systems, though this can be mitigated with optimized parsing libraries.
  - **Precision issues:** Parsing string representations into numeric types could also introduce precision issues to individual implementations.
  - **Numeric operations:** Numeric operations (i.e. sorting, aggregating, etc.) will be harder to do with the raw JSON output.

### Decision drivers

- Avoids common errors with floating point precision.
- Easy for API consumers to understand and debug.
- Supports mathematical operations like aggregation and sorting.
- Balances flexibility with consistency and interoperability.

### Options considered

- Floating point
- Decimal string representation
- Smallest unit integer
- Hybrid (integer + string display)

## Evaluation

### Side-by-side

- ✅ Criterion met
- ❌ Criterion not met
- 🟡 Partially met or unsure

| Criteria                       | Floating point | Decimal string | Integer | Hybrid |
| ------------------------------ | :------------: | :------------: | :-----: | :----: |
| Easy to understand             |       ✅       |       ✅       |   ❌    |   🟡   |
| Self-documenting               |       ✅       |       ✅       |   ❌    |   🟡   |
| Minimizes precision errors     |       ❌       |       🟡       |   ✅    |   ✅   |
| Supports math operations       |       🟡       |       🟡       |   ✅    |   ✅   |
| Supports non-standard subunits |       ✅       |       ✅       |   🟡    |   🟡   |

### Option 1: Floating point

Monetary values are represented as strings with fixed decimal points (e.g., `1234.56` for $1234.56).

- **Pros**
  - Human-readable and easier for API consumers to debug.
- **Cons**
  - Extremely vulnerable to floating-point precision issues.
  - Can introduce subtle errors with numeric operations.
  - Still requires conversion for display.
  - Non-standard format for representing currency.

### Option 2: Decimal string

Monetary values are represented as strings with fixed decimal points (e.g., `"1234.56"` for $1234.56).

- **Pros**
  - Human-readable and easier for API consumers to debug.
  - No conversion required for display or consumer-facing applications.
  - Suitable for currencies with non-standard subunits (e.g., cryptocurrencies).
  - Commonly used format for monetary values, e.g. PayPal, ApplePay, etc.
- **Cons**
  - Vulnerable to floating-point precision issues if parsed into floating-point numbers.
  - Parsing and validation of string inputs are more complex than integers.
  - Larger payload sizes compared to integer representation.

### Option 3: Smallest unit integer

Monetary values are represented as integers in the smallest unit of the currency (e.g., `123456` for $1234.56). This format allows all arithmetic to be done with whole numbers.

- **Pros**
  - Prevents floating-point precision errors.
  - Ideal for aggregation, sorting, and other arithmetic operations.
  - Compact representation (smaller payloads compared to string decimals).
  - Consistent format across implementations.
  - Commonly used format for monetary values, e.g. Stripe, Square.
- **Cons**
  - Less human-readable than string representations.
  - Requires explicit documentation of smallest unit conventions (e.g., cents for USD, yen has no subunit).
  - May need conversion logic for APIs or systems that expect floating-point values.

### Option 4: Hybrid

Monetary values are stored as integers (smallest unit) in the protocol but provide an additional optional field for string-formatted display (e.g., `"displayAmount": "1234.56"`).

- **Pros**
  - Combines the precision and compactness of integer storage with the human-readability of string decimals.
  - Avoids floating-point precision issues while supporting consumer-friendly display.
  - Provides flexibility for implementations to include a "calculated" or localized display value.
- **Cons**
  - Increases payload size with the addition of the optional display field.
  - Adds complexity for API producers, who must compute and include the display string.
  - Risks inconsistencies if the integer and display string are not aligned correctly.
  - Not a commonly used format for monetary values.
