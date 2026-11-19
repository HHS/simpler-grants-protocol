import { checkPathVersioning } from "../../../../commands/check/utils/check-path-versioning";
import { OpenAPIV3 } from "openapi-types";

const operation: OpenAPIV3.OperationObject = {
  responses: {
    "200": { description: "OK" },
  },
};

describe("checkPathVersioning", () => {
  // ############################################################
  // Flag version segments in the path
  // ############################################################

  it.each([
    {
      placement: "prefix",
      listPath: "/v0.6/common-grants/opportunities",
      itemPath: "/v0.6/common-grants/opportunities/{oppId}",
    },
    {
      placement: "infix",
      listPath: "/common-grants/v0.6/opportunities",
      itemPath: "/common-grants/v0.6/opportunities/{oppId}",
    },
  ])("should report one error when the version is a path $placement", ({ listPath, itemPath }) => {
    // Arrange - Create base spec with unversioned routes
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/common-grants/opportunities": { get: operation },
        "/common-grants/opportunities/{oppId}": { get: operation },
      },
    };

    // Arrange - Create impl spec with a version segment in each route
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        [listPath]: { get: operation },
        [itemPath]: { get: operation },
      },
    };

    // Act
    const errors = checkPathVersioning(baseDoc, implDoc);
    const error = errors.get(0);

    // Assert - One error explains the version belongs in the CG-Version header
    expect(errors.getErrorCount()).toBe(1);
    expect(error).toEqual(
      expect.objectContaining({
        type: "PATH_VERSIONING",
        level: "ERROR",
        message: expect.stringMatching(/CG-Version/),
      })
    );
  });

  // ############################################################
  // Leave unversioned and host-versioned paths alone
  // ############################################################

  describe("when the path is not versioned by the protocol", () => {
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/common-grants/opportunities": { get: operation },
        "/common-grants/opportunities/{oppId}": { get: operation },
      },
    };

    const buildImplDoc = (paths: string[]): OpenAPIV3.Document => ({
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: Object.fromEntries(paths.map(path => [path, { get: operation }])),
    });

    it("should report no errors when the impl has no version segments", () => {
      // Arrange
      const implDoc = buildImplDoc([
        "/common-grants/opportunities",
        "/common-grants/opportunities/{oppId}",
      ]);

      // Act
      const errors = checkPathVersioning(baseDoc, implDoc);

      // Assert
      expect(errors.getErrorCount()).toBe(0);
    });

    it.each([
      { kind: "host API prefix", path: "/api/v2/common-grants/opportunities" },
      { kind: "bare version prefix", path: "/v2/common-grants/opportunities" },
    ])("should allow host-level versioning with a $kind", ({ path }) => {
      // Arrange
      const implDoc = buildImplDoc([path]);

      // Act
      const errors = checkPathVersioning(baseDoc, implDoc);

      // Assert
      expect(errors.getErrorCount()).toBe(0);
    });

    it("should report no errors when a legacy versioned alias sits next to the base routes", () => {
      // Arrange
      const implDoc = buildImplDoc([
        "/common-grants/opportunities",
        "/common-grants/opportunities/{oppId}",
        "/v0.6/common-grants/opportunities",
      ]);

      // Act
      const errors = checkPathVersioning(baseDoc, implDoc);

      // Assert - The base routes exist, so the normal route checks apply instead
      expect(errors.getErrorCount()).toBe(0);
    });

    it("should report no errors when stripping the version does not give a base path", () => {
      // Arrange
      const implDoc = buildImplDoc(["/v0.6/common-grants/unknown"]);

      // Act
      const errors = checkPathVersioning(baseDoc, implDoc);

      // Assert
      expect(errors.getErrorCount()).toBe(0);
    });
  });

  // ############################################################
  // Report at most one error
  // ############################################################

  describe("when several routes are checked", () => {
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/common-grants/opportunities": { get: operation },
        "/common-grants/opportunities/{oppId}": { get: operation },
      },
    };

    const buildImplDoc = (paths: string[]): OpenAPIV3.Document => ({
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: Object.fromEntries(paths.map(path => [path, { get: operation }])),
    });

    it("should report one error when only some routes are versioned", () => {
      // Arrange
      const implDoc = buildImplDoc([
        "/common-grants/opportunities",
        "/v0.6/common-grants/opportunities/{oppId}",
      ]);

      // Act
      const errors = checkPathVersioning(baseDoc, implDoc);

      // Assert
      expect(errors.getErrorCount()).toBe(1);
    });

    it("should report one error when the routes use more than one version", () => {
      // Arrange
      const implDoc = buildImplDoc([
        "/v0.5/common-grants/opportunities",
        "/v0.6/common-grants/opportunities",
      ]);

      // Act
      const errors = checkPathVersioning(baseDoc, implDoc);

      // Assert
      expect(errors.getErrorCount()).toBe(1);
    });

    it("should report one error when the version segment is upper case", () => {
      // Arrange
      const implDoc = buildImplDoc([
        "/V0.6/common-grants/opportunities",
        "/V0.6/common-grants/opportunities/{oppId}",
      ]);

      // Act
      const errors = checkPathVersioning(baseDoc, implDoc);

      // Assert
      expect(errors.getErrorCount()).toBe(1);
      expect(errors.get(0)).toEqual(expect.objectContaining({ type: "PATH_VERSIONING" }));
    });

    it.each([
      { form: "patch version infix", path: "/common-grants/v0.6.0/opportunities" },
      { form: "version without a v prefix", path: "/0.6/common-grants/opportunities" },
    ])("should report one error for a $form", ({ path }) => {
      // Arrange
      const implDoc = buildImplDoc([path]);

      // Act
      const errors = checkPathVersioning(baseDoc, implDoc);

      // Assert
      expect(errors.getErrorCount()).toBe(1);
    });
  });
});
