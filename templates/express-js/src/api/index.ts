import express, { Express } from "express";
import cors from "cors";
import { docsRouter } from "./controllers/docs.controller";
import { oppRouter } from "./controllers/opportunity.controller";
import { errorHandler } from "./middleware/error.middleware";

const app: Express = express();

app.use(cors());
app.use(express.json());

// Welcome page with API information
app.get("/", (req, res) => {
  res.json({
    name: "Grants API",
    version: "1.0.0",
    description: "API for managing grant opportunities",
    endpoints: {
      documentation: {
        swagger: "/docs",
        openapi: "/docs/spec",
      },
      api: {
        health: "/health",
        opportunities: {
          list: "GET /opportunities",
          create: "POST /opportunities",
        },
      },
    },
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Register routers
app.use("/docs", docsRouter);
app.use("/common-grants/opportunities", oppRouter);

// Error handling
app.use(errorHandler);

// Start the server if this file is run directly
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log(`Documentation available at http://localhost:${port}/docs`);
  });
}

export { app };
