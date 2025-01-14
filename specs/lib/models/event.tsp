namespace OpportunityStream.Models;

// ########################################
// Model definition
// ########################################

@example(EventExamples.deadline, #{ title: "Application deadline with time" })
@example(EventExamples.openDate, #{ title: "Opening date without time" })
model Event {
  /** Name of the timeline event (e.g., 'Open Date', 'Deadline') */
  name: string;

  /** Date of the event in in ISO 8601 format: YYYY-MM-DD */
  date: isoDate;

  /** Time of the event in ISO 8601 format: HH:MM:SS */
  time?: isoTime;

  /** Detailed description of the timeline event */
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
