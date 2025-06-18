import "../index.tsp";
import "../../fields/index.tsp";

namespace CommonGrants.Models;

using CommonGrants.Fields;

// ########################################
// Model definition
// ########################################

/** Details about the funding available for this opportunity */
@example(
  Examples.Funding.awardRange,
  #{ title: "Award range but no total limit" }
)
@example(
  Examples.Funding.onlyLimit,
  #{ title: "Total funding limit but no award range" }
)
@example(Examples.Funding.allFields, #{ title: "All fields defined" })
model OppFunding {
  /** Total amount of funding available for this opportunity */
  totalAmountAvailable?: Money;

  /** Minimum amount of funding granted per award */
  minAwardAmount?: Money;

  /** Maximum amount of funding granted per award */
  maxAwardAmount?: Money;

  /** Minimum number of awards granted */
  minAwardCount?: integer;

  /** Maximum number of awards granted */
  maxAwardCount?: integer;

  /** Estimated number of awards that will be granted */
  estimatedAwardCount?: integer;
}

// ########################################
// Model examples
// ########################################

/** Examples of the OppFunding model */
namespace Examples.Funding {
  /** A FundingDetails example in which all of the fields are defined */
  const allFields = #{
    totalAmountAvailable: #{ amount: "1000000.00", currency: "USD" },
    minAwardAmount: #{ amount: "10000.00", currency: "USD" },
    maxAwardAmount: #{ amount: "50000.00", currency: "USD" },
    minAwardCount: 5,
    maxAwardCount: 20,
    estimatedAwardCount: 10,
  };

  /** A FundingDetails example that has an award range but no total limit */
  const awardRange = #{
    minAwardAmount: #{ amount: "10000.00", currency: "USD" },
    maxAwardAmount: #{ amount: "50000.00", currency: "USD" },
    minAwardCount: 5,
    maxAwardCount: 20,
  };

  /** A FundingDetails example that has a total limit but no award range */
  const onlyLimit = #{
    totalAmountAvailable: #{ amount: "1000000.00", currency: "USD" },
    estimatedAwardCount: 10,
  };
}
