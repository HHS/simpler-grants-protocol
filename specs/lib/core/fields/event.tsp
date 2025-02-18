import "../types.tsp";

namespace Core.Fields;

using Core.Types;

// ########################################
// Model definition
// ########################################

/** Description of an event that has a date (and possible time) associated with it */
@example(EventExamples.deadline, #{ title: "Application deadline with time" })
@example(EventExamples.openDate, #{ title: "Opening date without time" })
model Event {
  /** Human-readable name of the event (e.g., 'Application posted', 'Question deadline') */
  name: string;

  /** Date of the event in in ISO 8601 format: YYYY-MM-DD */
  date: isoDate;

  /** Time of the event in ISO 8601 format: HH:MM:SS */
  time?: isoTime;

  /** Description of what this event represents */
  description?: string;
}

// ########################################
// Model examples
// ########################################

namespace EventExamples {
  /** An example of a deadline event with a specific time */
  const deadline = #{
    name: "Application Deadline",
    date: isoDate.fromISO("2024-12-31"),
    time: isoTime.fromISO("17:00:00"),
    description: "Final submission deadline for all grant applications",
  };

  /** An example of an opening date without a specific time */
  const openDate = #{
    name: "Open Date",
    date: isoDate.fromISO("2024-01-15"),
    description: "Applications begin being accepted",
  };
}
