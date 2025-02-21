import { checkMissingRequiredRoutes } from "../../../services/validation/check-missing-routes";
import { OpenAPIV3 } from "openapi-types";

describe("checkMissingRequiredRoutes", () => {
  it("should report missing required route", () => {
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/foo": {
          get: {
            tags: ["required"],
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        // Missing /foo
      },
    };

    const errors = checkMissingRequiredRoutes(baseDoc, implDoc);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Missing required path/i);
  });

  it("should not report when required route is present", () => {
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/foo": {
          get: {
            tags: ["required"],
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        "/foo": {
          get: {
            tags: ["someTag"],
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    const errors = checkMissingRequiredRoutes(baseDoc, implDoc);
    expect(errors).toHaveLength(0);
  });

  it("should not report when path is optional", () => {
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/optional": {
          get: {
            tags: ["optional"],
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        // Missing /optional
      },
    };

    const errors = checkMissingRequiredRoutes(baseDoc, implDoc);
    expect(errors).toHaveLength(0);
  });
});
