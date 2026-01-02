import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Application } from "express";
import { env } from "./env";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "WishCube API",
      version: "1.0.0",
      description:
        "WishCube - Digital greeting cards, gifts, and event management platform API documentation",
      contact: {
        name: "WishCube Support",
      },
    },
    servers: [
      {
        url: `http://localhost:${env.port}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      { name: "Auth", description: "Authentication endpoints" },
      { name: "Cards", description: "Greeting cards management" },
      { name: "Websites", description: "Card websites management" },
      { name: "Wallet", description: "Wallet and transactions" },
      { name: "Gifts", description: "Gift management" },
      { name: "Events", description: "Events and RSVP management" },
      { name: "Dashboard", description: "User dashboard" },
      { name: "Admin", description: "Admin operations" },
    ],
  },
  apis: ["./src/routes/*.ts", "./src/models/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Application): void => {
  // Swagger UI
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "WishCube API Documentation",
    })
  );

  // JSON endpoint for the swagger spec
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
};
