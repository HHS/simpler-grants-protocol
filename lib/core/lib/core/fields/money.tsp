import "../types.tsp";

namespace CommonGrants.Fields;

using CommonGrants.Types;

// ########################################
// Model definition
// ########################################

/** A monetary amount and the currency in which its denominated */
@example(Examples.Money.usdWithCents, #{ title: "US dollars and cents" })
@example(
  Examples.Money.euroWithoutCents,
  #{ title: "Euros displayed without cents" }
)
@example(
  Examples.Money.usdNegative,
  #{ title: "A negative amount of US dollars and cents" }
)
model Money {
  /** The amount of money */
  amount: decimalString;

  /** The ISO 4217 currency code in which the amount is denominated */
  currency: string;
}

// ########################################
// Model examples
// ########################################

/** Examples of the Money model */
namespace Examples.Money {
  /** An example of a positive USD amount with cents */
  const usdWithCents = #{ amount: "10000.50", currency: "USD" };

  /** An example of a positive EUR amount without cents */
  const euroWithoutCents = #{ amount: "5000", currency: "EUR" };

  /** An example of a negative USD amount in accounting format */
  const usdNegative = #{ amount: "-50.50", currency: "USD" };
}
