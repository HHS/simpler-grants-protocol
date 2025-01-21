namespace CommonGrants.Models;

// ########################################
// Model definition
// ########################################

@example(CurrencyExamples.usdWithCents, #{ title: "US dollars and cents" })
@example(
  CurrencyExamples.euroWithoutCents,
  #{ title: "Euros displayed without cents" }
)
@example(
  CurrencyExamples.usdNegative,
  #{ title: "Accounting loss in US dollars and cents" }
)
model Currency {
  /** The amount of currency */
  amount: decimal;

  /** How the currency amount should be displayed */
  display: string;

  /** The ISO 4217 currency code in which the amount is denominated */
  currencyCode: string;
}

// ########################################
// Model examples
// ########################################

namespace CurrencyExamples {
  /** An example of a positive USD amount with cents */
  const usdWithCents = #{
    amount: 10000.50,
    display: "$10,000.50",
    currencyCode: "USD",
  };

  /** An example of a positive EUR amount without cents */
  const euroWithoutCents = #{
    amount: 5000.00,
    display: "€5,000",
    currencyCode: "EUR",
  };

  /** An example of a negative USD amount in accounting format */
  const usdNegative = #{
    amount: -50.50,
    display: "($50.50)",
    currencyCode: "USD",
  };
}
