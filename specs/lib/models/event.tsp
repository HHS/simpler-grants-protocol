namespace OpportunityStream.Models;

model Event {
  /** Name of the timeline event (e.g., 'Open Date', 'Deadline') */
  name: string;

  /** Date of the event in YYYY-MM-DD format */
  date: plainDate;

  /** Time of the event */
  time?: plainTime;

  /** Detailed description of the timeline event */
  description?: string;
}
