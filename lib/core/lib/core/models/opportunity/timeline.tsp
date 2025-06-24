import "../../fields/index.tsp";
import "../../types.tsp";

namespace CommonGrants.Models;

using CommonGrants.Fields;
using CommonGrants.Types;

// ########################################
// Model definition
// ########################################

/** Key dates and events in the opportunity's timeline, such as when the opportunity is posted and closes */
@example(Examples.Timeline.opportunity)
model OppTimeline {
  /** The date (and time) at which the opportunity is posted */
  postDate?: Event;

  /** The date (and time) at which the opportunity closes */
  closeDate?: Event;

  /** An optional map of other key dates or events in the opportunity timeline
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
    postDate: Fields.Examples.Event.postedDate,
    closeDate: Fields.Examples.Event.closeDate,
    otherDates: #{
      anticipatedAward: #{
        name: "Anticipated award date",
        eventType: EventType.singleDate,
        date: isoDate.fromISO("2025-03-15"),
        description: "When we expect to announce awards for this opportunity.",
      },
      applicationPeriod: Fields.Examples.Event.applicationPeriod,
      performancePeriod: Fields.Examples.Event.performancePeriod,
      infoSessions: #{
        name: "Info sessions",
        eventType: EventType.other,
        details: "Every other Tuesday",
        description: "Info sessions for the opportunity",
      },
    },
  };
}
