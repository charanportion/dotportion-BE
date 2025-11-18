export class SchemaCanvasController {
  constructor(
    schemaCanvasService,
    logger,
    createResponse,
    secretService,
    userService
  ) {
    this.schemaCanvasService = schemaCanvasService;
    this.logger = logger;
    this.createResponse = createResponse;
    this.secretService = secretService;
    this.userService = userService;
    this.logger.info(`-->Schema Controller initialized`);
  }

  parseBody(body) {
    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch (error) {
        this.logger.error(`Error parsing JSON body: ${error}`);
        throw new Error("Invalid JSON in request body");
      }
    }
    return body;
  }

  async createSchemaCanvas(event) {
    try {
      this.logger.info("-->createSchemaCanvas Controller Started");
      const body =
        typeof event.body === "string"
          ? JSON.parse(event.body)
          : event.body || {};
      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        return this.createResponse(400, { error: "Request body is missing." });
      }
      this.logger.info(`Received request body: ${JSON.stringify(body)}`);

      const { projectId, dataBase, nodes, edges } = body;

      const userId = event.requestContext.authorizer.userId;
      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      if (!projectId) {
        return this.createResponse(400, {
          error: "Project ID is required",
        });
      }
      if (!dataBase) {
        return this.createResponse(400, {
          error: "dataBase is required",
        });
      }
      if (!nodes) {
        return this.createResponse(400, {
          error: "nodes is required",
        });
      }
      if (!edges) {
        return this.createResponse(400, {
          error: "edges is required",
        });
      }

      const result = await this.schemaCanvasService.createSchemaCanvas(
        projectId,
        dataBase,
        userId,
        nodes,
        edges
      );

      if (result.error) {
        return this.createResponse(400, { error: result.message });
      }

      return this.createResponse(200, {
        message: "SchemaCanvas created",
        result,
      });
    } catch (error) {
      this.logger.error(`Error creating schema canvas: ${error}`);
      return this.createResponse(500, { error: "Internal server error" });
    }
  }

  async updateSchemaCanvas(event) {
    try {
      this.logger.info("-->createSchemaCanvas Controller Started");
      const body =
        typeof event.body === "string"
          ? JSON.parse(event.body)
          : event.body || {};
      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        return this.createResponse(400, { error: "Request body is missing." });
      }
      this.logger.info(`Received request body: ${JSON.stringify(body)}`);

      const { projectId, dataBase, nodes, edges } = body;

      const userId = event.requestContext.authorizer.userId;
      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      if (!projectId) {
        return this.createResponse(400, {
          error: "Project ID is required",
        });
      }
      if (!dataBase) {
        return this.createResponse(400, {
          error: "dataBase is required",
        });
      }
      if (!nodes) {
        return this.createResponse(400, {
          error: "nodes is required",
        });
      }
      if (!edges) {
        return this.createResponse(400, {
          error: "edges is required",
        });
      }

      const result = await this.schemaCanvasService.updateSchemaCanvas(
        projectId,
        dataBase,
        userId,
        nodes,
        edges
      );

      if (result.error) {
        return this.createResponse(400, { error: result.message });
      }

      return this.createResponse(200, {
        message: "SchemaCanvas updated",
        result,
      });
    } catch (error) {
      this.logger.error(`Error creating schema canvas: ${error}`);
      return this.createResponse(500, { error: "Internal server error" });
    }
  }

  async getSchemaCanvas(event) {
    try {
      this.logger.info("-->createSchemaCanvas Controller Started");
      const { projectId, dataBase } = event.pathParameters;
      const userId = event.requestContext.authorizer.userId;
      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      if (!projectId) {
        return this.createResponse(400, {
          error: "Project ID is required",
        });
      }
      if (!dataBase) {
        return this.createResponse(400, {
          error: "dataBase is required",
        });
      }

      const result = await this.schemaCanvasService.getSchemaCanvas(
        projectId,
        dataBase,
        userId
      );

      if (result.error) {
        return this.createResponse(400, { error: result.message });
      }

      return this.createResponse(200, {
        message: "Fetched Successfully",
        result,
      });
    } catch (error) {
      this.logger.error(`Error creating schema canvas: ${error}`);
      return this.createResponse(500, { error: "Internal server error" });
    }
  }

  async generateSchema(event) {
    try {
      this.logger.info("-->generateSchema Controller Started");
      const { projectId, dataBase } = event.pathParameters;
      const userId = event.requestContext.authorizer.userId;
      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      if (!projectId) {
        return this.createResponse(400, {
          error: "Project ID is required",
        });
      }
      if (!dataBase) {
        return this.createResponse(400, {
          error: "dataBase is required",
        });
      }

      let secret = null;

      if (dataBase !== "platform") {
        secret = await this.secretService.getSecret(
          projectId,
          userId,
          dataBase
        );

        if (secret.error) {
          return this.createResponse(400, { error: secret.message });
        }
      }

      const tenant = event.requestContext.authorizer.name;
      if (!tenant) {
        this.logger.error(
          "tenant not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      this.logger.info(`-->user tenant name ${JSON.stringify(tenant)}`);

      const result = await this.schemaCanvasService.generateSchema(
        projectId,
        dataBase,
        userId,
        secret,
        tenant
      );

      if (result.error) {
        return this.createResponse(400, { error: result.message });
      }

      return this.createResponse(200, {
        message: "Schema Generated Successfully",
        result,
      });
    } catch (error) {
      this.logger.error(`Error generating schema: ${error}`);
      return this.createResponse(500, { error: "Internal server error" });
    }
  }
}
