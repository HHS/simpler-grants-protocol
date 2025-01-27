namespace Responses.Success;

model Success {
    @example(200)
    status: int32;

    @example("Success")
    message: string;
}

/** Template for normal response data */
model Ok<T> extends Success {
    // Inherit the 200 status code
    ...Http.OkResponse;

    /** Response data */
    data: T;
}

/** Template for paginated responses */
model Paginated<T> extends Success {
    // Inherit the 200 status code
    ...Http.OkResponse;

    /** Items from the current page */
    @pageItems
    items: T[];

    /** Details about the paginated results */
    paginationInfo: {
        /** Current page number (indexing starts at 1) */
        @example(1)
        page: int32;

        /** Number of items per page */
        @example(20)
        pageSize: integer;

        /** Total number of items across all pages */
        @example(100)
        totalItems: integer;

        /** Total number of pages */
        @example(5)
        totalPages: integer;

        /** URL for the next page if available */
        @example("/opportunities?page=2&pageSize=20")
        nextPageUrl?: string;

        /** URL for the previous page if available */
        @example("/opportunities?page=1&pageSize=20")
        previousPageUrl?: string;
    };
}
