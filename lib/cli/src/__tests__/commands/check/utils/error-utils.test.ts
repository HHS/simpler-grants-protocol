import { ErrorCollection, ErrorFormatter } from "../../../../commands/check/utils/error-utils";
import { ComplianceError } from "../../../../commands/check/utils/types";

describe("ErrorCollection", () => {
  let errorCollection: ErrorCollection;

  beforeEach(() => {
    errorCollection = new ErrorCollection();
  });

  describe("addError", () => {
    it("should add a single error to the collection", () => {
      const error: ComplianceError = {
        type: "MISSING_ROUTE",
        level: "ERROR",
        endpoint: "/api/v1/users",
      };

      errorCollection.addError(error);
      expect(errorCollection.getErrorCount()).toBe(1);
      expect(errorCollection.get(0)).toEqual(error);
    });

    it("should track unique endpoints", () => {
      const error1: ComplianceError = {
        type: "MISSING_ROUTE",
        level: "ERROR",
        endpoint: "/api/v1/users",
      };
      const error2: ComplianceError = {
        type: "EXTRA_ROUTE",
        level: "ERROR",
        endpoint: "/api/v1/users",
      };

      errorCollection.addError(error1);
      errorCollection.addError(error2);
      expect(errorCollection.getEndpointCount()).toBe(1);
    });
  });

  describe("addErrors", () => {
    it("should add multiple errors to the collection", () => {
      const errors: ComplianceError[] = [
        {
          type: "MISSING_ROUTE",
          level: "ERROR",
          endpoint: "/api/v1/users",
        },
        {
          type: "EXTRA_ROUTE",
          level: "ERROR",
          endpoint: "/api/v1/posts",
        },
      ];

      errorCollection.addErrors(errors);
      expect(errorCollection.getErrorCount()).toBe(2);
      expect(errorCollection.getEndpointCount()).toBe(2);
    });
  });

  describe("filterByType", () => {
    it("should filter errors by type", () => {
      const errors: ComplianceError[] = [
        {
          type: "MISSING_ROUTE",
          level: "ERROR",
          endpoint: "/api/v1/users",
        },
        {
          type: "EXTRA_ROUTE",
          level: "ERROR",
          endpoint: "/api/v1/posts",
        },
      ];

      errorCollection.addErrors(errors);
      const filtered = errorCollection.filterByType("MISSING_ROUTE");
      expect(filtered.getErrorCount()).toBe(1);
      expect(filtered.get(0)?.type).toBe("MISSING_ROUTE");
    });
  });

  describe("filterByEndpoint", () => {
    it("should filter errors by endpoint", () => {
      const errors: ComplianceError[] = [
        {
          type: "MISSING_ROUTE",
          level: "ERROR",
          endpoint: "/api/v1/users",
        },
        {
          type: "EXTRA_ROUTE",
          level: "ERROR",
          endpoint: "/api/v1/posts",
        },
      ];

      errorCollection.addErrors(errors);
      const filtered = errorCollection.filterByEndpoint("/api/v1/users");
      expect(filtered.getErrorCount()).toBe(1);
      expect(filtered.get(0)?.endpoint).toBe("/api/v1/users");
    });
  });

  describe("filterByLevel", () => {
    it("should filter errors by level", () => {
      const errors: ComplianceError[] = [
        {
          type: "MISSING_ROUTE",
          level: "ERROR",
          endpoint: "/api/v1/users",
        },
        {
          type: "EXTRA_ROUTE",
          level: "WARNING",
          endpoint: "/api/v1/posts",
        },
      ];

      errorCollection.addErrors(errors);
      const filtered = errorCollection.filterByLevel("ERROR");
      expect(filtered.getErrorCount()).toBe(1);
      expect(filtered.get(0)?.level).toBe("ERROR");
    });
  });

  describe("iteration", () => {
    it("should be iterable", () => {
      const errors: ComplianceError[] = [
        {
          type: "MISSING_ROUTE",
          level: "ERROR",
          endpoint: "/api/v1/users",
        },
        {
          type: "EXTRA_ROUTE",
          level: "ERROR",
          endpoint: "/api/v1/posts",
        },
      ];

      errorCollection.addErrors(errors);
      const collectedErrors = Array.from(errorCollection);
      expect(collectedErrors).toEqual(errors);
    });
  });
});

describe("ErrorFormatter", () => {
  let errorCollection: ErrorCollection;
  let errorFormatter: ErrorFormatter;

  beforeEach(() => {
    errorCollection = new ErrorCollection();
    errorFormatter = new ErrorFormatter(errorCollection);
  });

  it("should return 'No errors found' when collection is empty", () => {
    expect(errorFormatter.format()).toBe("No errors found");
  });

  it("should format missing routes", () => {
    errorCollection.addError({
      type: "MISSING_ROUTE",
      level: "ERROR",
      endpoint: "/api/v1/users",
    });

    const formatted = errorFormatter.format();
    expect(formatted).toContain("1 errors");
    expect(formatted).toContain("Routes missing");
    expect(formatted).toContain("/api/v1/users");
  });

  it("should format extra routes", () => {
    errorCollection.addError({
      type: "EXTRA_ROUTE",
      level: "ERROR",
      endpoint: "/api/v1/posts",
    });

    const formatted = errorFormatter.format();
    expect(formatted).toContain("1 errors");
    expect(formatted).toContain("Extra routes");
    expect(formatted).toContain("/api/v1/posts");
  });

  it("should format route conflicts with all details", () => {
    errorCollection.addError({
      type: "ROUTE_CONFLICT",
      level: "ERROR",
      endpoint: "/api/v1/users",
      subType: "RESPONSE_BODY_CONFLICT",
      statusCode: "200",
      mimeType: "application/json",
      location: "response",
      conflictType: "TYPE_CONFLICT",
      message: "Type mismatch in response body",
    });

    const formatted = errorFormatter.format();
    expect(formatted).toContain("1 errors");
    expect(formatted).toContain("Route conflicts");
    expect(formatted).toContain("/api/v1/users");
    expect(formatted).toContain("Response schema conflict");
    expect(formatted).toContain("Status code: 200");
    expect(formatted).toContain("MIME Type: application/json");
    expect(formatted).toContain("Location: response");
    expect(formatted).toContain("Issue: Mismatched types");
    expect(formatted).toContain("Message: Type mismatch in response body");
  });

  it("should format multiple types of errors", () => {
    errorCollection.addError({
      type: "MISSING_ROUTE",
      level: "ERROR",
      endpoint: "/api/v1/users",
    });
    errorCollection.addError({
      type: "EXTRA_ROUTE",
      level: "ERROR",
      endpoint: "/api/v1/posts",
    });
    errorCollection.addError({
      type: "ROUTE_CONFLICT",
      level: "ERROR",
      endpoint: "/api/v1/comments",
      subType: "REQUEST_BODY_CONFLICT",
      conflictType: "ENUM_CONFLICT",
      message: "Enum value conflict in request body",
    });

    const formatted = errorFormatter.format();
    expect(formatted).toContain("3 errors");
    expect(formatted).toContain("Routes missing");
    expect(formatted).toContain("Extra routes");
    expect(formatted).toContain("Route conflicts");
    expect(formatted).toContain("Request schema conflict");
    expect(formatted).toContain("Issue: Enum value conflict");
  });
});
