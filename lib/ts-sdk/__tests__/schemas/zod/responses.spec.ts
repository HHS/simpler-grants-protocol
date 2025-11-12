import { describe, it, expect } from "vitest";
import { z } from "zod";
import { expectZodMatchesJsonSchema } from "../../helper";
import {
  SuccessSchema,
  OkSchema,
  PaginatedSchema,
  SortedSchema,
  FilteredSchema,
  CreatedSchema,
  ErrorSchema,
  UnauthorizedSchema,
  NotFoundSchema,
  ApplicationSubmissionErrorSchema,
} from "@/schemas";

// ############################################################################
// Success Schema
// ############################################################################

describe("Success Schema", () => {
  const jsonSchemaId = "Success.yaml";

  it("should validate a valid Success response", () => {
    const validSuccess = {
      status: 200,
      message: "Success",
    };
    expect(SuccessSchema.parse(validSuccess)).toEqual(validSuccess);
  });

  it("should validate a valid Success response with different status codes", () => {
    expect(SuccessSchema.parse({ status: 201, message: "Created" })).toEqual({
      status: 201,
      message: "Created",
    });
    expect(SuccessSchema.parse({ status: 204, message: "No Content" })).toEqual({
      status: 204,
      message: "No Content",
    });
  });

  it("should match Success.yaml", () => {
    expectZodMatchesJsonSchema(SuccessSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid Success response", () => {
    // Missing required field 'status'
    expect(() => SuccessSchema.parse({ message: "Success" })).toThrow();
    // Missing required field 'message'
    expect(() => SuccessSchema.parse({ status: 200 })).toThrow();
    // Status must be an integer
    expect(() => SuccessSchema.parse({ status: 200.5, message: "Success" })).toThrow();
    // Message must be a string
    expect(() => SuccessSchema.parse({ status: 200, message: 123 })).toThrow();
    // Wrong types
    expect(() => SuccessSchema.parse({ status: "200", message: "Success" })).toThrow();
  });
});

// ############################################################################
// Ok Schema (Generic)
// ############################################################################

describe("Ok Schema", () => {
  it("should validate a valid Ok response with string data", () => {
    const StringDataSchema = OkSchema(z.string());
    const validOk = {
      status: 200,
      message: "Success",
      data: "test data",
    };
    expect(StringDataSchema.parse(validOk)).toEqual(validOk);
  });

  it("should validate a valid Ok response with object data", () => {
    const ObjectDataSchema = OkSchema(
      z.object({
        id: z.string(),
        name: z.string(),
      })
    );
    const validOk = {
      status: 200,
      message: "Success",
      data: {
        id: "123",
        name: "Test",
      },
    };
    expect(ObjectDataSchema.parse(validOk)).toEqual(validOk);
  });

  it("should validate a valid Ok response with array data", () => {
    const ArrayDataSchema = OkSchema(z.array(z.string()));
    const validOk = {
      status: 200,
      message: "Success",
      data: ["item1", "item2"],
    };
    expect(ArrayDataSchema.parse(validOk)).toEqual(validOk);
  });

  it("should raise an error for an invalid Ok response", () => {
    const StringDataSchema = OkSchema(z.string());
    // Missing required field 'data'
    expect(() =>
      StringDataSchema.parse({
        status: 200,
        message: "Success",
      })
    ).toThrow();
    // Invalid data type
    expect(() =>
      StringDataSchema.parse({
        status: 200,
        message: "Success",
        data: 123,
      })
    ).toThrow();
  });
});

// ############################################################################
// Paginated Schema (Generic)
// ############################################################################

describe("Paginated Schema", () => {
  it("should validate a valid Paginated response", () => {
    const ItemSchema = z.object({
      id: z.string(),
      name: z.string(),
    });
    const PaginatedItemSchema = PaginatedSchema(ItemSchema);
    const validPaginated = {
      status: 200,
      message: "Success",
      items: [
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ],
      paginationInfo: {
        page: 1,
        pageSize: 20,
        totalItems: 100,
        totalPages: 5,
      },
    };
    expect(PaginatedItemSchema.parse(validPaginated)).toEqual(validPaginated);
  });

  it("should validate a valid Paginated response with empty items", () => {
    const ItemSchema = z.object({
      id: z.string(),
    });
    const PaginatedItemSchema = PaginatedSchema(ItemSchema);
    const validPaginated = {
      status: 200,
      message: "Success",
      items: [],
      paginationInfo: {
        page: 1,
        pageSize: 20,
      },
    };
    expect(PaginatedItemSchema.parse(validPaginated)).toEqual(validPaginated);
  });

  it("should raise an error for an invalid Paginated response", () => {
    const ItemSchema = z.object({
      id: z.string(),
    });
    const PaginatedItemSchema = PaginatedSchema(ItemSchema);
    // Missing required field 'items'
    expect(() =>
      PaginatedItemSchema.parse({
        status: 200,
        message: "Success",
        paginationInfo: {
          page: 1,
          pageSize: 20,
        },
      })
    ).toThrow();
    // Missing required field 'paginationInfo'
    expect(() =>
      PaginatedItemSchema.parse({
        status: 200,
        message: "Success",
        items: [],
      })
    ).toThrow();
    // Invalid items (not an array)
    expect(() =>
      PaginatedItemSchema.parse({
        status: 200,
        message: "Success",
        items: "not an array",
        paginationInfo: {
          page: 1,
          pageSize: 20,
        },
      })
    ).toThrow();
  });
});

// ############################################################################
// Sorted Schema (Generic)
// ############################################################################

describe("Sorted Schema", () => {
  it("should validate a valid Sorted response", () => {
    const ItemSchema = z.object({
      id: z.string(),
      name: z.string(),
    });
    const SortedItemSchema = SortedSchema(ItemSchema);
    const validSorted = {
      status: 200,
      message: "Success",
      items: [
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ],
      paginationInfo: {
        page: 1,
        pageSize: 20,
        totalItems: 100,
        totalPages: 5,
      },
      sortInfo: {
        sortBy: "name",
        sortOrder: "asc" as const,
      },
    };
    expect(SortedItemSchema.parse(validSorted)).toEqual(validSorted);
  });

  it("should validate a valid Sorted response with all optional fields", () => {
    const ItemSchema = z.object({
      id: z.string(),
    });
    const SortedItemSchema = SortedSchema(ItemSchema);
    const validSorted = {
      status: 200,
      message: "Success",
      items: [],
      paginationInfo: {
        page: 1,
        pageSize: 20,
      },
      sortInfo: {
        sortBy: "id",
        customSortBy: "customField",
        sortOrder: "desc" as const,
        errors: ["Warning"],
      },
    };
    expect(SortedItemSchema.parse(validSorted)).toEqual(validSorted);
  });

  it("should raise an error for an invalid Sorted response", () => {
    const ItemSchema = z.object({
      id: z.string(),
    });
    const SortedItemSchema = SortedSchema(ItemSchema);
    // Missing required field 'sortInfo'
    expect(() =>
      SortedItemSchema.parse({
        status: 200,
        message: "Success",
        items: [],
        paginationInfo: {
          page: 1,
          pageSize: 20,
        },
      })
    ).toThrow();
  });
});

// ############################################################################
// Filtered Schema (Generic)
// ############################################################################

describe("Filtered Schema", () => {
  it("should validate a valid Filtered response", () => {
    const ItemSchema = z.object({
      id: z.string(),
      name: z.string(),
    });
    const FilterSchema = z.object({
      name: z.string(),
    });
    const FilteredItemSchema = FilteredSchema(ItemSchema, FilterSchema);
    const validFiltered = {
      status: 200,
      message: "Success",
      items: [
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ],
      paginationInfo: {
        page: 1,
        pageSize: 20,
        totalItems: 100,
        totalPages: 5,
      },
      sortInfo: {
        sortBy: "name",
        sortOrder: "asc" as const,
      },
      filterInfo: {
        filters: {
          name: "test",
        },
      },
    };
    expect(FilteredItemSchema.parse(validFiltered)).toEqual(validFiltered);
  });

  it("should validate a valid Filtered response with errors", () => {
    const ItemSchema = z.object({
      id: z.string(),
    });
    const FilterSchema = z.object({
      status: z.string(),
    });
    const FilteredItemSchema = FilteredSchema(ItemSchema, FilterSchema);
    const validFiltered = {
      status: 200,
      message: "Success",
      items: [],
      paginationInfo: {
        page: 1,
        pageSize: 20,
      },
      sortInfo: {
        sortBy: "id",
        sortOrder: "desc" as const,
      },
      filterInfo: {
        filters: {
          status: "active",
        },
        errors: ["Warning: Some filters could not be applied"],
      },
    };
    expect(FilteredItemSchema.parse(validFiltered)).toEqual(validFiltered);
  });

  it("should raise an error for an invalid Filtered response", () => {
    const ItemSchema = z.object({
      id: z.string(),
    });
    const FilterSchema = z.object({
      name: z.string(),
    });
    const FilteredItemSchema = FilteredSchema(ItemSchema, FilterSchema);
    // Missing required field 'filterInfo'
    expect(() =>
      FilteredItemSchema.parse({
        status: 200,
        message: "Success",
        items: [],
        paginationInfo: {
          page: 1,
          pageSize: 20,
        },
        sortInfo: {
          sortBy: "id",
          sortOrder: "asc" as const,
        },
      })
    ).toThrow();
    // Invalid filterInfo structure
    expect(() =>
      FilteredItemSchema.parse({
        status: 200,
        message: "Success",
        items: [],
        paginationInfo: {
          page: 1,
          pageSize: 20,
        },
        sortInfo: {
          sortBy: "id",
          sortOrder: "asc" as const,
        },
        filterInfo: {
          filters: {
            invalidField: "value",
          },
        },
      })
    ).toThrow();
  });
});

// ############################################################################
// Created Schema (Generic)
// ############################################################################

describe("Created Schema", () => {
  it("should validate a valid Created response with object data", () => {
    const ObjectDataSchema = CreatedSchema(
      z.object({
        id: z.string(),
        name: z.string(),
      })
    );
    const validCreated = {
      status: 201,
      message: "Created",
      data: {
        id: "123",
        name: "Test",
      },
    };
    expect(ObjectDataSchema.parse(validCreated)).toEqual(validCreated);
  });

  it("should raise an error for an invalid Created response", () => {
    const ObjectDataSchema = CreatedSchema(
      z.object({
        id: z.string(),
      })
    );
    // Missing required field 'data'
    expect(() =>
      ObjectDataSchema.parse({
        status: 201,
        message: "Created",
      })
    ).toThrow();
  });
});

// ############################################################################
// Error Schema
// ############################################################################

describe("Error Schema", () => {
  const jsonSchemaId = "Error.yaml";

  it("should validate a valid Error response", () => {
    const validError = {
      status: 400,
      message: "Error",
      errors: [],
    };
    expect(ErrorSchema.parse(validError)).toEqual(validError);
  });

  it("should validate a valid Error response with error details", () => {
    const validError = {
      status: 400,
      message: "Validation failed",
      errors: [
        { field: "name", message: "Name is required" },
        { field: "email", message: "Email is invalid" },
      ],
    };
    expect(ErrorSchema.parse(validError)).toEqual(validError);
  });

  it("should match Error.yaml", () => {
    expectZodMatchesJsonSchema(ErrorSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid Error response", () => {
    // Missing required field 'status'
    expect(() => ErrorSchema.parse({ message: "Error", errors: [] })).toThrow();
    // Missing required field 'message'
    expect(() => ErrorSchema.parse({ status: 400, errors: [] })).toThrow();
    // Missing required field 'errors'
    expect(() => ErrorSchema.parse({ status: 400, message: "Error" })).toThrow();
    // Status must be an integer
    expect(() => ErrorSchema.parse({ status: 400.5, message: "Error", errors: [] })).toThrow();
    // Message must be a string
    expect(() => ErrorSchema.parse({ status: 400, message: 123, errors: [] })).toThrow();
    // Errors must be an array
    expect(() =>
      ErrorSchema.parse({ status: 400, message: "Error", errors: "not array" })
    ).toThrow();
  });
});

// ############################################################################
// Unauthorized Schema
// ############################################################################

describe("Unauthorized Schema", () => {
  it("should validate a valid Unauthorized response", () => {
    const validUnauthorized = {
      status: 401,
      message: "Unauthorized",
      errors: [],
    };
    expect(UnauthorizedSchema.parse(validUnauthorized)).toEqual(validUnauthorized);
  });

  it("should raise an error for an invalid Unauthorized response", () => {
    // Wrong status code
    expect(() =>
      UnauthorizedSchema.parse({
        status: 400,
        message: "Unauthorized",
        errors: [],
      })
    ).toThrow();
    expect(() =>
      UnauthorizedSchema.parse({
        status: 403,
        message: "Unauthorized",
        errors: [],
      })
    ).toThrow();
  });
});

// ############################################################################
// NotFound Schema
// ############################################################################

describe("NotFound Schema", () => {
  it("should validate a valid NotFound response", () => {
    const validNotFound = {
      status: 404,
      message: "Not Found",
      errors: [],
    };
    expect(NotFoundSchema.parse(validNotFound)).toEqual(validNotFound);
  });

  it("should raise an error for an invalid NotFound response", () => {
    // Wrong status code
    expect(() =>
      NotFoundSchema.parse({
        status: 400,
        message: "Not Found",
        errors: [],
      })
    ).toThrow();
    expect(() =>
      NotFoundSchema.parse({
        status: 500,
        message: "Not Found",
        errors: [],
      })
    ).toThrow();
  });
});

// ############################################################################
// ApplicationSubmissionError Schema
// ############################################################################

describe("ApplicationSubmissionError Schema", () => {
  const jsonSchemaId = "ApplicationSubmissionError.yaml";

  it("should validate a valid ApplicationSubmissionError response", () => {
    const validError = {
      status: 400,
      message: "Application submission failed due to validation errors",
      errors: [
        {
          field: "formA.name",
          message: "Name is required",
        },
      ],
    };
    expect(ApplicationSubmissionErrorSchema.parse(validError)).toEqual(validError);
  });

  it("should match ApplicationSubmissionError.yaml", () => {
    expectZodMatchesJsonSchema(ApplicationSubmissionErrorSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid ApplicationSubmissionError response", () => {
    // Wrong status code
    expect(() =>
      ApplicationSubmissionErrorSchema.parse({
        status: 401,
        message: "Application submission failed due to validation errors",
        errors: [],
      })
    ).toThrow();
    expect(() =>
      ApplicationSubmissionErrorSchema.parse({
        status: 500,
        message: "Application submission failed due to validation errors",
        errors: [],
      })
    ).toThrow();
  });
});
