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
      const body = this.parseBody(event.body);
      const { projectId, dataBase, nodes, edges } = body;
      const cognitoSub = event.requestContext.authorizer.claims.sub;

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
      if (!cognitoSub) {
        return this.createResponse(401, {
          error: "User ID not found in request",
        });
      }

      const result = await this.schemaCanvasService.createSchemaCanvas(
        projectId,
        dataBase,
        cognitoSub,
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
      const body = this.parseBody(event.body);
      const { projectId, dataBase, nodes, edges } = body;
      const cognitoSub = event.requestContext.authorizer.claims.sub;

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
      if (!cognitoSub) {
        return this.createResponse(401, {
          error: "User ID not found in request",
        });
      }

      const result = await this.schemaCanvasService.updateSchemaCanvas(
        projectId,
        dataBase,
        cognitoSub,
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
      const cognitoSub = event.requestContext.authorizer.claims.sub;

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

      if (!cognitoSub) {
        return this.createResponse(401, {
          error: "User ID not found in request",
        });
      }

      const result = await this.schemaCanvasService.getSchemaCanvas(
        projectId,
        dataBase,
        cognitoSub
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
      const cognitoSub = event.requestContext.authorizer.claims.sub;

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
      if (!cognitoSub) {
        return this.createResponse(401, {
          error: "User ID not found in request",
        });
      }

      let secret = null;

      if (dataBase !== "platform") {
        secret = await this.secretService.getSecret(
          projectId,
          cognitoSub,
          dataBase
        );

        if (secret.error) {
          return this.createResponse(400, { error: secret.message });
        }
      }

      const tenant = await this.userService.getTenant(cognitoSub);

      if (!tenant) {
        return this.createResponse(400, { error: tenant.message });
      }

      this.logger.info(`-->user tenant name ${JSON.stringify(tenant)}`);

      const result = await this.schemaCanvasService.generateSchema(
        projectId,
        dataBase,
        cognitoSub,
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
