using TypeSpec.Http;

namespace OpportunityStream.Models;

model FundingDetails {
  totalAmountAvailable?: Currency;
  minAwardAmount?: Currency;
  maxAwardAmount?: Currency;
  minAwardCount?: integer;
  maxAwardCount?: integer;
  estimatedAwardCount?: integer;
}
