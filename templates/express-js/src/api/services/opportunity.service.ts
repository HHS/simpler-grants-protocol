import { ApiError } from "../middleware/error-handler";
import { Opportunity, CustomFieldType } from "../validation/schemas";

/**
 * Mock data for development and testing.
 * This will be replaced with actual database integration.
 */
const mockOpportunities: Opportunity[] = [
  {
    source: "National Science Foundation",
    title: "Research Innovation Grant 2024",
    agencyDept: "Division of Research Programs",
    status: "active",
    categories: ["Research", "Science", "Innovation"],
    description:
      "Supporting groundbreaking research initiatives across scientific disciplines",
    applicationTimeline: [
      {
        name: "Letter of Intent Deadline",
        date: "2024-03-15",
        description:
          "Submit initial letter of intent outlining research proposal",
      },
      {
        name: "Application Portal Opens",
        date: "2024-04-01",
        description:
          "Online application system becomes available for full proposals",
      },
      {
        name: "Final Submission Deadline",
        date: "2024-06-30",
        description:
          "Complete application packages must be submitted by 11:59 PM EST",
      },
    ],
    fundingDetails: {
      awardRange: {
        min: { amount: 50000, currency: "USD" },
        max: { amount: 500000, currency: "USD" },
      },
      matchRequirement: {
        required: true,
        percentage: 20,
      },
      fundingURL: "https://nsf.gov/funding/research-innovation-2024",
    },
    geographicScope: "United States",
    applicantEligibility: [
      "Research Universities",
      "Non-profit Research Institutions",
      "Small Business Research Organizations",
    ],
    grantURL: "https://nsf.gov/grants/research-innovation-2024",
    customFields: {
      programCode: {
        name: "Program Code",
        type: "string" as CustomFieldType,
        format: "text",
        value: "NSF-RIG-2024",
        description: "Internal NSF program identifier",
      },
      reviewType: {
        name: "Review Type",
        type: "string" as CustomFieldType,
        format: "text",
        value: "Peer Review",
        description: "Method of proposal evaluation",
      },
      anticipatedAwards: {
        name: "Anticipated Number of Awards",
        type: "number" as CustomFieldType,
        format: "integer",
        value: 50,
        description: "Expected number of grants to be awarded",
      },
    },
  },
  {
    source: "Department of Energy",
    title: "Clean Energy Innovation Grant",
    agencyDept: "Office of Energy Efficiency",
    status: "active",
    categories: ["Energy", "Environment", "Technology"],
    description:
      "Advancing clean energy solutions through innovative research and development",
    applicationTimeline: [
      {
        name: "Technical Assistance Workshop",
        description: "Virtual workshop for potential applicants",
        date: "2024-02-15",
      },
      {
        name: "Submission Deadline",
        description: "Final deadline for all proposals",
        date: "2024-04-30",
      },
    ],
    fundingDetails: {
      awardRange: {
        min: { amount: 100000, currency: "USD" },
        max: { amount: 1000000, currency: "USD" },
      },
      matchRequirement: {
        required: false,
        percentage: 0,
      },
      fundingURL: "https://energy.gov/grants/clean-energy-2024",
    },
    geographicScope: "United States",
    applicantEligibility: [
      "Private Companies",
      "Research Institutions",
      "State Energy Offices",
    ],
    grantURL: "https://energy.gov/opportunities/clean-energy-2024",
    customFields: {
      focusArea: {
        name: "Technology Focus Area",
        type: "string" as CustomFieldType,
        format: "text",
        value: "Renewable Energy",
        description: "Primary technology area of focus",
      },
      projectDuration: {
        name: "Project Duration",
        type: "number" as CustomFieldType,
        format: "integer",
        value: 24,
        description: "Expected project duration in months",
      },
    },
  },
];

/**
 * Service class for managing grant opportunities.
 * Handles CRUD operations and search functionality for grant opportunities.
 */
export class OpportunitiesService {
  /**
   * Retrieves a list of all grant opportunities.
   * @returns Promise resolving to an array of opportunities
   */
  async listOpportunities(): Promise<Opportunity[]> {
    return mockOpportunities;
  }

  /**
   * Retrieves a specific grant opportunity by its title.
   * @param title - The title of the opportunity to retrieve
   * @returns Promise resolving to the found opportunity
   * @throws {ApiError} If opportunity is not found
   */
  async getOpportunityByTitle(title: string): Promise<Opportunity> {
    const opportunity = mockOpportunities.find((g) => g.title === title);
    if (!opportunity) {
      throw new ApiError(404, `Opportunity with title ${title} not found`);
    }
    return opportunity;
  }
  /**
   * Searches for grant opportunities matching the given query.
   * Searches across title, description, and categories.
   * @param query - The search query string
   * @returns Promise resolving to an array of matching opportunities
   */
  async searchOpportunities(query: string): Promise<Opportunity[]> {
    const lowercaseQuery = query.toLowerCase();
    return mockOpportunities.filter(
      (opportunity) =>
        opportunity.title.toLowerCase().includes(lowercaseQuery) ||
        opportunity.description.toLowerCase().includes(lowercaseQuery) ||
        opportunity.categories.some((cat) =>
          cat.toLowerCase().includes(lowercaseQuery)
        )
    );
  }
}
