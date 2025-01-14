using TypeSpec.Http;

namespace OpportunityStream.Models;

// ########################################
// Model definition
// ########################################

@example(FundingExamples.allFields, #{ title: "All fields defined" })
@example(
  FundingExamples.awardRange,
  #{ title: "Award range but no total limit" }
)
@example(
  FundingExamples.onlyLimit,
  #{ title: "Total funding limit but no award range" }
)
model FundingDetails {
  totalAmountAvailable?: Currency;
  minAwardAmount?: Currency;
  maxAwardAmount?: Currency;
  minAwardCount?: integer;
  maxAwardCount?: integer;
  estimatedAwardCount?: integer;
}

// ########################################
// Model examples
// ########################################

namespace FundingExamples {
  /** A FundingDetails example in which all of the fields are defined */
  const allFields = #{
    totalAmountAvailable: #{
      amount: 1000000.00,
      display: "$1,000,000",
      currencyCode: "USD",
    },
    minAwardAmount: #{
      amount: 10000.00,
      display: "$10,000",
      currencyCode: "USD",
    },
    maxAwardAmount: #{
      amount: 50000.00,
      display: "$50,000.00",
      currencyCode: "USD",
    },
    minAwardCount: 5,
    maxAwardCount: 20,
    estimatedAwardCount: 10,
  };

  /** A FundingDetails example that has an award range but no total limit */
  const awardRange = #{
    minAwardAmount: #{
      amount: 10000.00,
      display: "$10,000",
      currencyCode: "USD",
    },
    maxAwardAmount: #{
      amount: 50000.00,
      display: "$50,000",
      currencyCode: "USD",
    },
    minAwardCount: 5,
    maxAwardCount: 20,
  };

  /** A FundingDetails example that has a total limit but no award range */
  const onlyLimit = #{
    totalAmountAvailable: #{
      amount: 1000000.00,
      display: "$1,000,000",
      currencyCode: "USD",
    },
    estimatedAwardCount: 10,
  };
}
