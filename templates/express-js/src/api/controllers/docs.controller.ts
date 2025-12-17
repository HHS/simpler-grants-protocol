import { Router, Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import { DocumentationService } from "../services/documentation.service";

export const docsRouter: Router = Router();

// Middleware to check if OpenAPI spec exists
const checkSpecExists = (req: Request, res: Response, next: NextFunction) => {
  if (!DocumentationService.isSpecGenerated()) {
    return res.status(404).json({
      error: {
        message: "OpenAPI specification not found. Please run `npm run prepare` first.",
      },
    });
  }
  next();
};

// Serve Swagger UI
docsRouter.use("/", checkSpecExists, swaggerUi.serve);

// Swagger UI HTML
docsRouter.get(
  "/",
  swaggerUi.setup(DocumentationService.getOpenApiSpec(), {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Grants API Documentation",
  })
);

// Raw OpenAPI spec endpoint
docsRouter.get("/spec", checkSpecExists, (req: Request, res: Response, next: NextFunction) => {
  try {
    const spec = DocumentationService.getOpenApiSpec();
    res.json(spec);
  } catch (error) {
    next(error);
  }
});

// Documentation metadata
docsRouter.get("/meta", checkSpecExists, (req: Request, res: Response) => {
  const lastModified = DocumentationService.getSpecLastModified();
  res.json({
    lastModified,
    specExists: true,
    endpoints: {
      ui: "/docs",
      spec: "/docs/spec",
      meta: "/docs/meta",
    },
  });
});
