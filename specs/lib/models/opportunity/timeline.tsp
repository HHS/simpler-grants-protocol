import "../event.tsp";
import "../custom-enum.tsp";

namespace CommonGrants.Models.Opportunity;

// ########################################
// Model definition
// ########################################

/** Key dates in the opportunity's timeline, such as when the application opens and closes */
@example(TimelineExamples.opportunity)
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

namespace TimelineExamples {
    const opportunity = #{
        appOpens: EventExamples.openDate,
        appDeadline: EventExamples.deadline,
        otherDates: #{
            anticipatedAward: #{
                name: "Anticipated award date",
                date: isoDate.fromISO("2025-03-15"),
                description: "When we expect to announce awards for this opportunity.",
            },
        },
    };
}
