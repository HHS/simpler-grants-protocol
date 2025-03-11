import { ApiError } from "../middleware/error.middleware";
import {
  Opportunity,
  OppFilters,
  OppSorting,
  PaginationInfo,
  OpportunitiesListResponse,
  OpportunitiesSearchResponse,
} from "../schemas";
import { mockOpportunity, paginate } from "./utils";

/**
 * Mock data for development and testing.
 * This will be replaced with actual database integration.
 */
const mockOpportunities: Opportunity[] = [
  mockOpportunity({
    title: "Opportunity 1",
    status: "closed",
    totalAvailable: 5_000_000,
    minAwardAmount: 100_000,
    appOpens: new Date("2025-01-01"),
    appDeadline: new Date("2025-01-31"),
  }),
  mockOpportunity({
    title: "Opportunity 2",
    status: "closed",
    totalAvailable: 5_000_000,
    minAwardAmount: 100_000,
    maxAwardAmount: 500_000,
    appOpens: new Date("2025-01-01"),
    appDeadline: new Date("2025-01-31"),
  }),
  mockOpportunity({
    title: "Opportunity 3",
    status: "open",
    totalAvailable: 750_000,
    minAwardAmount: 10_000,
    appOpens: new Date("2025-01-02"),
    appDeadline: new Date("2025-02-28"),
  }),
  mockOpportunity({
    title: "Opportunity 4",
    status: "open",
    totalAvailable: 500_000,
    minAwardAmount: 1_000,
    appOpens: new Date("2025-02-01"),
    appDeadline: new Date("2025-03-31"),
  }),
  mockOpportunity({
    title: "Opportunity 5",
    status: "open",
    minAwardAmount: 1_000,
    maxAwardAmount: 5_000,
    appOpens: new Date("2025-03-01"),
    appDeadline: new Date("2025-03-30"),
  }),
  mockOpportunity({
    title: "Opportunity 6",
    status: "open",
    minAwardAmount: 15_000,
    maxAwardAmount: 25_000,
    maxAwardCount: 10,
    appOpens: new Date("2025-03-01"),
    appDeadline: new Date("2025-03-30"),
  }),
  mockOpportunity({
    title: "Opportunity 7",
    status: "open",
    minAwardAmount: 5_000,
    maxAwardAmount: 25_000,
    appOpens: new Date("2025-03-15"),
    appDeadline: new Date("2025-04-15"),
  }),
  mockOpportunity({
    title: "Opportunity 8",
    status: "open",
    minAwardAmount: 30_000,
    maxAwardAmount: 50_000,
    minAwardCount: 5,
    maxAwardCount: 10,
    appOpens: new Date("2025-04-01"),
    appDeadline: new Date("2025-04-30"),
  }),
  mockOpportunity({
    title: "Opportunity 9",
    status: "forecasted",
    totalAvailable: 2_500_000,
    minAwardAmount: 50_000,
    appOpens: new Date("2025-05-01"),
  }),
  mockOpportunity({
    title: "Opportunity 10",
    status: "forecasted",
    totalAvailable: 500_000,
    maxAwardAmount: 10_000,
    appOpens: new Date("2025-05-01"),
  }),
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
  async listOpportunities(page: number, pageSize: number): Promise<OpportunitiesListResponse> {
    const pages = paginate(mockOpportunities, page, pageSize);
    return {
      message: "Opportunities retrieved successfully",
      items: pages.items,
      paginationInfo: pages.paginationInfo,
    };
  }

  /**
   * Retrieves a specific grant opportunity by its title.
   * @param title - The title of the opportunity to retrieve
   * @returns Promise resolving to the found opportunity
   * @throws {ApiError} If opportunity is not found
   */
  async getOpportunityByTitle(title: string): Promise<Opportunity> {
    const opportunity = mockOpportunities.find(g => g.title === title);
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
  async searchOpportunities(
    filters: OppFilters,
    sorting: OppSorting,
    pagination: PaginationInfo
  ): Promise<OpportunitiesSearchResponse> {
    const filteredOpportunities = mockOpportunities;
    const paginatedOpportunities = paginate(
      filteredOpportunities,
      pagination.page,
      pagination.pageSize
    );
    return {
      message: "Opportunities retrieved successfully",
      items: paginatedOpportunities.items,
      paginationInfo: paginatedOpportunities.paginationInfo,
      sortInfo: sorting,
      filterInfo: filters,
    };
  }
}
