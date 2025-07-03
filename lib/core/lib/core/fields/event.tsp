import "../types.tsp";

namespace CommonGrants.Fields;

using Types;

// ########################################
// Event type
// ########################################

/** Type of event (e.g., a single date, a date range, or a custom event)
 *
 * - singleDate: A single date (and possible time)
 * - dateRange: A period of time with a start and end date
 * - other: Other event type (e.g., a recurring event)
 */
enum EventType {
  /** A single date with no time */
  singleDate,

  /** A range of dates with no time */
  dateRange,

  /** Other event type */
  other,
}

// ########################################
// Event
// ########################################

/** Union of all event types */
union Event {
  /** A single date event */
  singleDate: SingleDateEvent,

  /** A date range event */
  dateRange: DateRangeEvent,

  /** Other event type */
  other: OtherEvent,
}

// ########################################
// Event base
// ########################################

/** Base model for all events */
@discriminator("eventType")
model EventBase {
  /** Human-readable name of the event (e.g., 'Application posted', 'Question deadline') */
  name: string;

  /** Type of event */
  eventType: EventType;

  /** Description of what this event represents */
  description?: string;
}

// ########################################
// Single date event
// ########################################

/** Description of an event that has a date (and possible time) associated with it */
@example(Examples.Event.postedDate, #{ title: "Opportunity posted date" })
@example(Examples.Event.closeDate, #{ title: "Opportunity close date" })
model SingleDateEvent extends EventBase {
  /** Type of event */
  eventType: EventType.singleDate;

  /** Date of the event in in ISO 8601 format: YYYY-MM-DD */
  date: isoDate;

  /** Time of the event in ISO 8601 format: HH:MM:SS */
  time?: isoTime;
}

// ########################################
// Date range event
// ########################################

/** Description of an event that has a start and end date (and possible time) associated with it */
@example(Examples.Event.performancePeriod, #{ title: "Period of performance" })
@example(Examples.Event.applicationPeriod, #{ title: "Application period" })
model DateRangeEvent extends EventBase {
  /** Type of event */
  eventType: EventType.dateRange;

  /** Start date of the event in ISO 8601 format: YYYY-MM-DD */
  startDate: isoDate;

  /** Start time of the event in ISO 8601 format: HH:MM:SS */
  startTime?: isoTime;

  /** End date of the event in ISO 8601 format: YYYY-MM-DD */
  endDate: isoDate;

  /** End time of the event in ISO 8601 format: HH:MM:SS */
  endTime?: isoTime;
}

// ########################################
// Custom event
// ########################################

/** Description of an event that is not a single date or date range */
@example(Examples.Event.infoSessions, #{ title: "Info sessions" })
model OtherEvent extends EventBase {
  /** Type of event */
  eventType: EventType.other;

  /** Details of the event's timeline (e.g. "Every other Tuesday") */
  details?: string;

  /** Description of the event */
  @example("Applications begin being accepted")
  description?: string;
}

// ########################################
// Model examples
// ########################################

namespace Examples.Event {
  /** An example of a deadline event with a specific time */
  const closeDate = #{
    name: "Opportunity close date",
    eventType: EventType.singleDate,
    date: isoDate.fromISO("2024-12-31"),
    time: isoTime.fromISO("17:00:00"),
    description: "Opportunity closes for all applications",
  };

  /** An example of an opportunity posted date without a specific time */
  const postedDate = #{
    name: "Application posted date",
    eventType: EventType.singleDate,
    date: isoDate.fromISO("2024-01-15"),
    description: "Opportunity is posted publicly",
  };

  /** Period of application for the grant */
  const applicationPeriod = #{
    name: "Application period",
    eventType: EventType.dateRange,
    startDate: isoDate.fromISO("2024-01-01"),
    endDate: isoDate.fromISO("2024-01-31"),
    endTime: isoTime.fromISO("17:00:00"),
    description: "Primary application period for the grant opportunity",
  };

  /** Period of performance for the grant */
  const performancePeriod = #{
    name: "Period of Performance",
    eventType: EventType.dateRange,
    startDate: isoDate.fromISO("2024-01-01"),
    endDate: isoDate.fromISO("2024-12-31"),
    description: "Period of performance for the grant",
  };

  /** Info sessions for the opportunity */
  const infoSessions = #{
    name: "Info sessions",
    eventType: EventType.other,
    details: "Every other Tuesday at 10:00 AM during the application period",
    description: "Info sessions for the opportunity",
  };
}
