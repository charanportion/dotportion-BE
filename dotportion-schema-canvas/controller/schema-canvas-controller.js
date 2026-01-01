// import { createLog } from "../../layers/common/nodejs/utils/activityLogger.js";
import { createLog } from "../opt/nodejs/utils/activityLogger.js";

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
    const userId = event.requestContext.authorizer.userId;
    const { projectId, dataBase } = event.pathParameters;
    try {
      this.logger.info("-->generateSchema Controller Started");

      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        createLog({
          userId: userId || null,
          action: "generate schema",
          type: "warn",
          metadata: {
            request: {
              database: dataBase,
              projectId: projectId,
            },
            response: {
              status: 403,
              message: "Forbidden: User identifier not found.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      if (!projectId) {
        createLog({
          userId: userId || null,
          action: "generate schema",
          type: "warn",
          metadata: {
            request: event.pathParameters,
            response: {
              status: 400,
              message: "ProjectId is missing.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, {
          error: "Project ID is required",
        });
      }
      if (!dataBase) {
        createLog({
          userId: userId || null,
          action: "generate schema",
          type: "warn",
          metadata: {
            request: projectId,
            response: {
              status: 400,
              message: "Database is missing.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
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
          createLog({
            userId: userId || null,
            action: "generate schema",
            type: "error",
            metadata: {
              request: {
                database: dataBase,
                projectId: projectId,
              },
              response: { status: 400, error: secret.message },
              ip: event?.requestContext?.identity?.sourceIp || "unknown",
              userAgent: event?.headers?.["User-Agent"] || "unknown",
            },
          });
          return this.createResponse(400, { error: secret.message });
        }
      }

      const tenant = event.requestContext.authorizer.name;
      if (!tenant) {
        this.logger.error(
          "tenant not found in the event. Check authorizer configuration."
        );
        createLog({
          userId: userId || null,
          action: "generate schema",
          type: "warn",
          metadata: {
            request: {
              database: dataBase,
              projectId: projectId,
            },
            response: {
              status: 403,
              message: "Forbidden: User identifier not found.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
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
        createLog({
          userId: userId || null,
          action: "generate schema",
          type: "error",
          metadata: {
            request: {
              database: dataBase,
              projectId: projectId,
            },
            response: { status: 400, error: result.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, { error: result.message });
      }
      createLog({
        userId: userId || null,
        action: "generate schema",
        type: "info",
        metadata: {
          request: {
            database: dataBase,
            projectId: projectId,
          },
          response: result,
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });

      return this.createResponse(200, {
        message: "Schema Generated Successfully",
        result,
      });
    } catch (error) {
      this.logger.error(`Error generating schema: ${error}`);
      createLog({
        userId: userId || null,
        action: "generate schema",
        type: "error",
        metadata: {
          request: {
            database: dataBase,
            projectId: projectId,
          },
          response: { status: 500, error: error.message },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
      return this.createResponse(500, { error: "Internal server error" });
    }
  }
}
