import { Router, Request, Response, NextFunction } from "express";
import { OpportunitiesService } from "../services/opportunity.service";
import { ValidationService } from "../validation/validation.service";

/**
 * Router for handling grant opportunity endpoints.
 * Provides routes for listing, retrieving, and searching grant opportunities.
 */
export const oppRouter = Router();
const oppService = new OpportunitiesService();

/**
 * GET /grants
 * Lists all available grant opportunities.
 * @route GET /grants
 * @returns {Promise<Opportunity[]>} Array of grant opportunities
 */
oppRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const opportunities = await oppService.listOpportunities();
    res.json(opportunities);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /grants/:title
 * Retrieves a specific grant opportunity by its title.
 * @route GET /grants/:title
 * @param {string} title.path - Title of the grant opportunity
 * @returns {Promise<Opportunity>} The requested grant opportunity
 * @throws {404} If opportunity is not found
 */
oppRouter.get(
  "/:title",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const opportunity = await oppService.getOpportunityByTitle(
        req.params.title
      );
      res.json(opportunity);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /grants/search
 * Searches for grant opportunities matching the query.
 * @route GET /grants/search
 * @param {string} q.query - Search query string
 * @returns {Promise<Opportunity[]>} Array of matching grant opportunities
 * @throws {400} If search query is invalid
 */
oppRouter.get(
  "/search",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query.q as string;
      ValidationService.validateSearchQuery(query);
      const opportunities = await oppService.searchOpportunities(query);
      res.json(opportunities);
    } catch (error) {
      next(error);
    }
  }
);
