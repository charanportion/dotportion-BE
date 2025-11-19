export class ProjectController {
  constructor(projectService, logger, createResponse) {
    this.projectService = projectService;
    this.logger = logger;
    this.createResponse = createResponse;
    this.logger.info(`-->Project Controller initialized`);
  }

  async createProject(event) {
    try {
      this.logger.info(
        "--> createProject controller invoked with event:",
        event
      );

      // const cognitoSub = event.requestContext.authorizer.claims.sub;
      const userId = event.requestContext.authorizer.userId;

      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      const body =
        typeof event.body === "string"
          ? JSON.parse(event.body)
          : event.body || {};

      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        return this.createResponse(400, { error: "Request body is missing." });
      }

      this.logger.info(`Received request body: ${JSON.stringify(body)}`);

      const result = await this.projectService.createProject(body, userId);

      if (result.error) {
        this.logger.error("Error creating project:", result.message);
        return this.createResponse(500, { message: result.message });
      }

      this.logger.info("Project created successfully:", result);

      return this.createResponse(201, {
        message: "Project created successfully.",
        data: result,
      });
    } catch (error) {
      this.logger.error(
        "Error in createProject handler:",
        JSON.stringify(error)
      );
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }

  async getProjects(event) {
    try {
      this.logger.info("--> getProjects controller invoked with event:", event);

      // const cognitoSub = event.requestContext.authorizer.claims.sub;
      const userId = event.requestContext.authorizer.userId;

      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      const result = await this.projectService.getProjectByOwner(userId);
      if (result.error) {
        this.logger.error("Error getting projects:", result.message);
        return this.createResponse(500, { message: result.message });
      }
      this.logger.info("Projects fetched successfully:", result);
      return this.createResponse(200, {
        message: "Projects fetched successfully.",
        data: result,
      });
    } catch (error) {
      this.logger.error("Error in getProjects handler:", JSON.stringify(error));
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }

  async getProject(event) {
    try {
      this.logger.info("--> getProject controller invoked with event:", event);

      // const cognitoSub = event.requestContext.authorizer.claims.sub;
      const userId = event.requestContext.authorizer.userId;

      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      const { projectId } = event.pathParameters;
      if (!projectId) {
        this.logger.error("Validation failed: Missing projectId.");
        return this.createResponse(400, { error: "ProjectId is missing." });
      }

      const result = await this.projectService.getProjectById(
        projectId,
        userId
      );
      if (result.error) {
        this.logger.error("Error getting project:", result.message);
        return this.createResponse(500, { message: result.message });
      }
      this.logger.info("Project fetched successfully:", result);
      return this.createResponse(200, {
        message: "Project fetched successfully.",
        data: result,
      });
    } catch (error) {
      this.logger.error("Error in getProject handler:", JSON.stringify(error));
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }

  async updateProject(event) {
    try {
      this.logger.info(
        "--> updateProject controller invoked with event:",
        event
      );

      // const cognitoSub = event.requestContext.authorizer.claims.sub;
      const userId = event.requestContext.authorizer.userId;

      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      const { projectId } = event.pathParameters;
      if (!projectId) {
        this.logger.error("Validation failed: Missing projectId.");
        return this.createResponse(400, { error: "ProjectId is missing." });
      }

      const body =
        typeof event.body === "string"
          ? JSON.parse(event.body)
          : event.body || {};

      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        return this.createResponse(400, { error: "Request body is missing." });
      }

      this.logger.info(`Received request body: ${JSON.stringify(body)}`);
      const result = await this.projectService.updateProject(
        projectId,
        userId,
        body
      );

      if (result.error) {
        this.logger.error("Error updating project:", result.message);
        return this.createResponse(500, { message: result.message });
      }
      this.logger.info("Project updated successfully:", result);
      return this.createResponse(200, {
        message: "Project updated successfully.",
        data: result,
      });
    } catch (error) {
      this.logger.error(
        `Error in updateProject handler: ${JSON.stringify(error)}`
      );
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }

  async deleteProject(event) {
    try {
      this.logger.info(
        "--> deleteProject controller invoked with event:",
        event
      );

      // const cognitoSub = event.requestContext.authorizer.claims.sub;
      const userId = event.requestContext.authorizer.userId;

      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      const { projectId } = event.pathParameters;
      if (!projectId) {
        this.logger.error("Validation failed: Missing projectId.");
        return this.createResponse(400, { error: "ProjectId is missing." });
      }

      const result = await this.projectService.deleteProject(projectId, userId);

      if (result.error) {
        this.logger.error("Error Deleting project:", result.message);
        return this.createResponse(500, { message: result.message });
      }

      this.logger.info("Project Deleted successfully:", result);

      return this.createResponse(200, {
        message: "Project Deleted successfully.",
        data: result,
      });
    } catch (error) {
      this.logger.error(
        "Error in deleteProject handler:",
        JSON.stringify(error)
      );
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }

  async getCallsOverTime(event) {
    try {
      this.logger.info(
        "--> getCallsOverTime controller invoked with event:",
        event
      );

      // const cognitoSub = event.requestContext.authorizer.claims.sub;
      const userId = event.requestContext.authorizer.userId;
      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      const { projectId } = event.pathParameters;
      if (!projectId) {
        this.logger.error("Validation failed: Missing projectId.");
        return this.createResponse(400, { error: "ProjectId is missing." });
      }

      const { queryStringParameters } = event;

      // Parse query parameters
      const range = parseInt(queryStringParameters?.range) || 7;
      const groupBy = queryStringParameters?.groupBy || "day"; // day, week, hour
      const selectedDate = queryStringParameters?.selectedDate || null; // for hourly view

      // Validate groupBy parameter
      if (!["day", "week", "hour"].includes(groupBy)) {
        this.logger.error("Invalid groupBy parameter:", groupBy);
        return this.createResponse(400, {
          error: "Invalid groupBy parameter. Must be 'day', 'week', or 'hour'.",
        });
      }

      const result = await this.projectService.getCallsOverTime(
        projectId,
        userId,
        range,
        groupBy,
        selectedDate
      );

      if (result.error) {
        this.logger.error("Error getting calls over time:", result.message);
        return this.createResponse(500, { message: result.message });
      }

      this.logger.info("Calls over time fetched successfully:", result);
      return this.createResponse(200, {
        message: "Calls over time fetched successfully.",
        data: result,
      });
    } catch (error) {
      this.logger.error(
        "Error in getCallsOverTime handler:",
        JSON.stringify(error)
      );
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }
}
