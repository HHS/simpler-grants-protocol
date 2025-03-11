import { z } from "zod";

// Default values for pagination
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 100;

/** Query parameters for paginated routes */
export const PaginatedQueryParamsSchema = z.object({
  /** The page to return (minimum value: 1) */
  page: z.coerce.number().int().min(1).optional().default(DEFAULT_PAGE),
  /** The number of items to return per page (minimum value: 1) */
  pageSize: z.coerce.number().int().min(1).optional().default(DEFAULT_PAGE_SIZE),
});

/** Body parameters for paginated routes */
export const PaginatedBodyParamsSchema = z.object({
  /** The page to return (minimum value: 1) */
  page: z.number().int().min(1).optional().default(DEFAULT_PAGE),
  /** The number of items to return per page (minimum value: 1) */
  pageSize: z.number().int().min(1).optional().default(DEFAULT_PAGE_SIZE),
});

/** Details about the paginated results */
export const PaginationInfoSchema = z.object({
  /** Current page number (indexing starts at 1) */
  page: z.number().int().min(1),
  /** Number of items per page */
  pageSize: z.number().int().min(1),
  /** Total number of items across all pages */
  totalItems: z.number().int().optional(),
  /** Total number of pages */
  totalPages: z.number().int().optional(),
});

// Export types inferred from the schemas
export type PaginatedQueryParams = z.infer<typeof PaginatedQueryParamsSchema>;
export type PaginatedBodyParams = z.infer<typeof PaginatedBodyParamsSchema>;
export type PaginationInfo = z.infer<typeof PaginationInfoSchema>;
