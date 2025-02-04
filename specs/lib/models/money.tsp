namespace CommonGrants.Models;

// ########################################
// Model definition
// ########################################

/** A monetary amount and the currency in which its denominated */
@example(MoneyExamples.usdWithCents, #{ title: "US dollars and cents" })
@example(
  MoneyExamples.euroWithoutCents,
  #{ title: "Euros displayed without cents" }
)
@example(
  MoneyExamples.usdNegative,
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

namespace MoneyExamples {
  /** An example of a positive USD amount with cents */
  const usdWithCents = #{ amount: "10000.50", currency: "USD" };

  /** An example of a positive EUR amount without cents */
  const euroWithoutCents = #{ amount: "5000", currency: "EUR" };

  /** An example of a negative USD amount in accounting format */
  const usdNegative = #{ amount: "-50.50", currency: "USD" };
}
