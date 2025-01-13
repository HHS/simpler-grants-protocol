namespace OpportunityStream.Models;

/** Represents a grant opportunity */
model Opportunity {
  /** Origin or provider of the opportunity */
  source: string;

  /** Title or name of the grant opportunity */
  title: string;

  /** Department or agency administering the opportunity */
  agencyDept: string;

  /** Current status of the opportunity (e.g., active, closed) */
  status: string;

  /** Description of the opportunity's purpose and scope */
  description: string;

  /** Key dates and milestones in the application process */
  applicationTimeline: Event[];

  /** Details about the funding available */
  fundingDetails: FundingDetails;

  /** Additional custom fields specific to this opportunity */
  customFields: CustomField[];
}
