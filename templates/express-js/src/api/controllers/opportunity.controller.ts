import { Router, Request, Response, NextFunction } from "express";
import { OpportunitiesService } from "../services/opportunity.service";
import { PaginatedQueryParamsSchema } from "../schemas/pagination";
import { oppSortingSchema, oppDefaultFiltersSchema } from "../schemas/models";

/**
 * Router for handling grant opportunity endpoints.
 * Provides routes for listing, retrieving, and searching grant opportunities.
 */
export const oppRouter = Router();
const oppService = new OpportunitiesService();

/**
 * GET /common-grants/opportunities
 * Lists all available grant opportunities, sorted by lastModifiedAt with most recent first.
 * @route GET /common-grants/opportunities
 * @param {number} page - The page number to retrieve (default: 1)
 * @param {number} pageSize - The number of items per page (default: 10)
 * @returns {Promise<OpportunitiesListResponse>} Paginated list of opportunities
 */
oppRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, pageSize = 10 } = PaginatedQueryParamsSchema.parse(req.query);
    const response = await oppService.listOpportunities(page, pageSize);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /common-grants/opportunities/:id
 * Retrieves a specific grant opportunity by its ID.
 * @route GET /common-grants/opportunities/:id
 * @param {string} id.path - UUID of the grant opportunity
 * @returns {Promise<OpportunityResponse>} The requested grant opportunity
 * @responses {404} Opportunity not found - Returns a JSON error object with a message
 */
oppRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const opportunity = await oppService.getOpportunityByTitle(req.params.id);
    res.json({
      message: "Success",
      data: opportunity,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /common-grants/opportunities/search
 * Searches for grant opportunities based on provided filters.
 * @route POST /common-grants/opportunities/search
 * @param {OppFilters} filters - Filter criteria
 * @param {OppSorting} sorting - Sort criteria
 * @param {PaginationBodyParams} pagination - Pagination parameters
 * @returns {Promise<OpportunitiesSearchResponse>} Filtered and paginated opportunities
 */
oppRouter.post("/search", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = oppDefaultFiltersSchema.parse(req.body.filters ?? {});
    const sorting = oppSortingSchema.parse(req.body.sorting ?? { sortBy: "lastModifiedAt" });
    const pagination = PaginatedQueryParamsSchema.parse(
      req.body.pagination ?? { page: 1, pageSize: 10 }
    );

    const opportunities = await oppService.searchOpportunities(filters, sorting, pagination);
    res.json(opportunities);
  } catch (error) {
    next(error);
  }
});
