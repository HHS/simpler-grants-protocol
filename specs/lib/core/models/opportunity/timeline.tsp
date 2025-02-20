import "../../fields/index.tsp";
import "../../types.tsp";

namespace CommonGrants.Models;

using CommonGrants.Fields;
using CommonGrants.Types;

// ########################################
// Model definition
// ########################################

/** Key dates in the opportunity's timeline, such as when the application opens and closes */
@example(Examples.Timeline.opportunity)
model OppTimeline {
  /** The date (and time) at which the opportunity begins accepting applications */
  appOpens?: Event;

  /** The final deadline for submitting applications */
  appDeadline?: Event;

  /** An optional map of other key dates in the opportunity timeline
   *
   * Examples might include a deadline for questions, anticipated award date, etc.
   */
  otherDates?: Record<Event>;
}

// ########################################
// Model examples
// ########################################

/** Examples of the OppTimeline model */
namespace Examples.Timeline {
  const opportunity = #{
    appOpens: Fields.Examples.Event.openDate,
    appDeadline: Fields.Examples.Event.deadline,
    otherDates: #{
      anticipatedAward: #{
        name: "Anticipated award date",
        date: isoDate.fromISO("2025-03-15"),
        description: "When we expect to announce awards for this opportunity.",
      },
    },
  };
}
