/**
 * Response schemas for the CommonGrants API.
 *
 * These schemas define the structure of API responses, including success and error responses.
 * Generic schemas like `Ok<T>`, `Paginated<T>`, and `Filtered<T>` can be used with other schemas.
 *
 * @packageDocumentation
 */

import { z } from "zod";
import { PaginatedResultsInfoSchema } from "./pagination";
import { SortedResultsInfoSchema } from "./sorting";

// ############################################################################
// Base Success Response
// ############################################################################

/** Default success response */
export const SuccessSchema = z.object({
  /** HTTP status code */
  status: z.number().int(),

  /** Success message */
  message: z.string(),
});

// ############################################################################
// Generic Success Response Schemas
// ############################################################################

/**
 * Template for a 200 response with data
 *
 * @template T The schema for the value of the `"data"` property in this response
 * @example How to specify a custom 200 response model
 *
 * ```typescript
 * // Define a schema
 * const CustomModelSchema = z.object({
 *   id: z.string(),
 *   description: z.string(),
 * });
 *
 * // Pass that schema to the `OkSchema` function
 * const CustomModel200Schema = OkSchema(CustomModelSchema);
 * ```
 */
export const OkSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  SuccessSchema.extend({
    /** Response data */
    data: dataSchema,
  });

/**
 * Template for a 200 response with paginated list of items
 *
 * @template T The schema for the value of the `"items"` property in this response
 * @example How to specify a custom paginated response model
 *
 * ```typescript
 * // Define a schema
 * const CustomModelSchema = z.object({
 *   id: z.string(),
 *   description: z.string(),
 * });
 *
 * // Pass that schema to the `PaginatedSchema` function
 * const CustomModelResponseSchema = PaginatedSchema(CustomModelSchema);
 * ```
 */
export const PaginatedSchema = <T extends z.ZodTypeAny>(itemsSchema: T) =>
  SuccessSchema.extend({
    /** Items from the current page */
    items: z.array(itemsSchema),

    /** Details about the paginated results */
    paginationInfo: PaginatedResultsInfoSchema,
  });

/**
 * A paginated list of items with a sort order
 *
 * @template T The schema for the value of the `"items"` property in this response
 * @example How to specify a custom sorted response model
 *
 * ```typescript
 * // Define a schema
 * const CustomModelSchema = z.object({
 *   id: z.string(),
 *   description: z.string(),
 * });
 *
 * // Pass that schema to the `SortedSchema` function
 * const CustomModelSortedResponseSchema = SortedSchema(CustomModelSchema);
 * ```
 */
export const SortedSchema = <T extends z.ZodTypeAny>(itemsSchema: T) =>
  PaginatedSchema(itemsSchema).extend({
    /** The sort order of the items */
    sortInfo: SortedResultsInfoSchema,
  });

/**
 * A paginated list of items with a filter
 *
 * @template ItemsT The schema for the value of the `"items"` property in this response
 * @template FilterT The schema for the value of the `"filter"` property in this response
 * @example How to specify a custom filtered response model
 *
 * ```typescript
 * // Define a schema for the items in the response
 * const CustomModelSchema = z.object({
 *   id: z.string(),
 *   description: z.string(),
 * });
 *
 * // Define a schema for the filter in the response
 * const CustomFilterSchema = z.object({
 *   lastModifiedAt: DateComparisonFilterSchema,
 * });
 *
 * // Pass those schemas to the `FilteredSchema` function
 * const CustomModelFilteredResponseSchema = FilteredSchema(CustomModelSchema, CustomFilterSchema);
 * ```
 */
export const FilteredSchema = <ItemsT extends z.ZodTypeAny, FilterT extends z.ZodTypeAny>(
  itemsSchema: ItemsT,
  filterSchema: FilterT
) =>
  SortedSchema(itemsSchema).extend({
    /** The filters applied to the response items */
    filterInfo: z
      .object({
        filters: filterSchema,

        /** Non-fatal errors that occurred during filtering */
        errors: z.array(z.string()).nullish(),
      })
      .strict(),
  });

/**
 * A 201 response with data
 *
 * @template T The schema for the value of the `"data"` property in this response
 * @example How to specify a custom 201 response model
 *
 * ```typescript
 * // Define a schema
 * const CustomModelSchema = z.object({
 *   id: z.string(),
 *   description: z.string(),
 * });
 *
 * // Pass that schema to the `CreatedSchema` function
 * const CustomModel201Schema = CreatedSchema(CustomModelSchema);
 * ```
 */
export const CreatedSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  SuccessSchema.extend({
    /** Response data */
    data: dataSchema,
  });

// ############################################################################
// Error Response Schemas
// ############################################################################

/** A standard error response schema */
export const ErrorSchema = z.object({
  /** HTTP status code */
  status: z.number().int(),

  /** Human-readable error message */
  message: z.string(),

  /** List of errors */
  errors: z.array(z.unknown()),
});

/** A 401 Unauthorized error response */
export const UnauthorizedSchema = ErrorSchema.extend({
  status: z.literal(401),
});

/** A 404 Not Found error response */
export const NotFoundSchema = ErrorSchema.extend({
  status: z.literal(404),
});

/** A failure to submit an application due to validation errors */
export const ApplicationSubmissionErrorSchema = ErrorSchema.extend({
  status: z.literal(400),
});
