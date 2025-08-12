export class SecretController {
  constructor(
    secretService,
    projectService,
    logger,
    createResponse,
    userService
  ) {
    this.secretService = secretService;
    this.projectService = projectService;
    this.logger = logger;
    this.createResponse = createResponse;
    this.userService = userService;
    this.logger.info(`-->Secret Controller initialized`);
  }

  async createSecret(event) {
    try {
      this.logger.info(
        "--> createSecret controller invoked with event:",
        event
      );
      const cognitoSub = event.requestContext.authorizer.claims.sub;
      const { body } = event;
      const { projectId } = event.pathParameters;

      if (!cognitoSub) {
        this.logger.error(
          "Cognito 'sub' claim not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        return this.createResponse(400, { error: "Request body is missing." });
      }

      this.logger.info(`Received request body: ${JSON.stringify(body)}`);
      const secretData = JSON.parse(body);
      // const secretData = body;

      if (!projectId) {
        this.logger.error(
          "Validation failed: Missing projectId in request Path Parameters."
        );
        return this.createResponse(400, {
          error: "ProjectId is missing in request Path Parameters.",
        });
      }

      // Verify that the project exists and belongs to the user
      const project = await this.projectService.getProjectById(
        projectId,
        cognitoSub
      );
      if (!project || project.error) {
        this.logger.error("Project not found or access denied");
        return this.createResponse(404, {
          message: "Project not found or access denied.",
        });
      }

      const user = await this.userService.findUserByCognitoSub(cognitoSub);
      if (!user || user.error) {
        this.logger.error("User not found or access denied");
        return this.createResponse(404, {
          message: "User not found or access denied.",
        });
      }

      // Extract tenant from user
      const tenant = user.name;

      // Create the secret
      const secret = await this.secretService.createSecret(
        tenant,
        cognitoSub,
        projectId,
        secretData
      );

      if (secret.error) {
        this.logger.error("Error creating secret:", secret.message);
        return this.createResponse(500, { message: secret.message });
      }

      const updatedProject = await this.projectService.addSecretToProject(
        projectId,
        secret._id
      );

      if (updatedProject.error) {
        this.logger.error(
          "Error adding secret to project:",
          updatedProject.message
        );
        return this.createResponse(500, { message: updatedProject.message });
      }

      this.logger.info(
        "Secret created and added to project successfully:",
        secret
      );
      return this.createResponse(201, {
        message: "Secret created successfully.",
        data: secret,
      });
    } catch (error) {
      this.logger.error(
        "Error in createSecret handler:",
        JSON.stringify(error)
      );
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }

  async getProjectSecrets(event) {
    try {
      this.logger.info(
        "--> getProjectSecrets controller invoked with event:",
        event
      );
      const cognitoSub = event.requestContext.authorizer.claims.sub;
      const { projectId } = event.pathParameters;

      if (!cognitoSub) {
        this.logger.error(
          "Cognito 'sub' claim not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      if (!projectId) {
        this.logger.error("Validation failed: Missing projectId.");
        return this.createResponse(400, { error: "ProjectId is missing." });
      }

      // Verify that the project exists and belongs to the user
      const project = await this.projectService.getProjectById(
        projectId,
        cognitoSub
      );
      if (!project || project.error) {
        this.logger.error("Project not found or access denied");
        return this.createResponse(404, {
          message: "Project not found or access denied.",
        });
      }

      const secrets = await this.secretService.getProjectSecrets(
        cognitoSub,
        projectId
      );
      if (secrets.error) {
        this.logger.error("Error getting secrets:", secrets.message);
        return this.createResponse(500, { message: secrets.message });
      }

      this.logger.info("Project secrets fetched successfully:", secrets);
      return this.createResponse(200, {
        message: "Project secrets fetched successfully.",
        data: secrets,
      });
    } catch (error) {
      this.logger.error(
        "Error in getProjectSecrets handler:",
        JSON.stringify(error)
      );
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }

  async getSecretById(event) {
    try {
      this.logger.info(
        "--> getSecretById controller invoked with event:",
        event
      );
      const cognitoSub = event.requestContext.authorizer.claims.sub;
      const { secretId } = event.pathParameters;

      if (!cognitoSub) {
        this.logger.error(
          "Cognito 'sub' claim not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      if (!secretId) {
        this.logger.error("Validation failed: Missing secretId.");
        return this.createResponse(400, { error: "SecretId is missing." });
      }

      const secret = await this.secretService.getSecretById(
        cognitoSub,
        secretId
      );
      if (secret.error) {
        this.logger.error("Error getting secret:", secret.message);
        return this.createResponse(500, { message: secret.message });
      }

      this.logger.info("Secret fetched successfully:", secret);
      return this.createResponse(200, {
        message: "Secret fetched successfully.",
        data: secret,
      });
    } catch (error) {
      this.logger.error(
        "Error in getSecretById handler:",
        JSON.stringify(error)
      );
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }

  async updateSecret(event) {
    try {
      this.logger.info(
        "--> updateSecret controller invoked with event:",
        event
      );
      const cognitoSub = event.requestContext.authorizer.claims.sub;
      const { secretId } = event.pathParameters;
      const { body } = event;

      if (!cognitoSub) {
        this.logger.error(
          "Cognito 'sub' claim not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      if (!secretId) {
        this.logger.error("Validation failed: Missing secretId.");
        return this.createResponse(400, { error: "SecretId is missing." });
      }

      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        return this.createResponse(400, { error: "Request body is missing." });
      }

      this.logger.info(`Received request body: ${JSON.stringify(body)}`);
      const updateData = JSON.parse(body);

      const result = await this.secretService.updateSecret(
        cognitoSub,
        secretId,
        updateData
      );
      if (result.error) {
        this.logger.error("Error updating secret:", result.message);
        return this.createResponse(500, { message: result.message });
      }

      this.logger.info("Secret updated successfully:", result);
      return this.createResponse(200, {
        message: "Secret updated successfully.",
        data: result,
      });
    } catch (error) {
      this.logger.error(
        "Error in updateSecret handler:",
        JSON.stringify(error)
      );
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }

  async deleteSecret(event) {
    try {
      this.logger.info(
        "--> deleteSecret controller invoked with event:",
        event
      );
      const cognitoSub = event.requestContext.authorizer.claims.sub;
      const { secretId } = event.pathParameters;

      if (!cognitoSub) {
        this.logger.error(
          "Cognito 'sub' claim not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      if (!secretId) {
        this.logger.error("Validation failed: Missing secretId.");
        return this.createResponse(400, { error: "SecretId is missing." });
      }

      const result = await this.secretService.deleteSecret(
        cognitoSub,
        secretId
      );
      if (result.error) {
        this.logger.error("Error deleting secret:", result.message);
        return this.createResponse(500, { message: result.message });
      }

      // Remove the secret from the project
      const updatedProject = await this.projectService.removeSecretFromProject(
        result.project,
        secretId
      );

      if (updatedProject.error) {
        this.logger.error(
          "Error removing secret from project:",
          updatedProject.message
        );
        this.logger.warn("Secret deleted but failed to remove from project");
      }

      this.logger.info("Secret deleted successfully:", result);
      return this.createResponse(200, {
        message: "Secret deleted successfully.",
        data: {
          status: "success",
          secret: result,
        },
      });
    } catch (error) {
      this.logger.error(
        "Error in deleteSecret handler:",
        JSON.stringify(error)
      );
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }

  async getSecretByProvider(event) {
    try {
      this.logger.info(
        "--> getSecretByProvider controller invoked with event:",
        event
      );
      const cognitoSub = event.requestContext.authorizer.claims.sub;
      const { projectId, provider } = event.pathParameters;

      if (!cognitoSub) {
        this.logger.error(
          "Cognito 'sub' claim not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      if (!projectId) {
        this.logger.error("Validation failed: Missing projectId.");
        return this.createResponse(400, { error: "ProjectId is missing." });
      }

      if (!provider) {
        this.logger.error("Validation failed: Missing provider.");
        return this.createResponse(400, { error: "Provider is missing." });
      }

      // Verify that the project exists and belongs to the user
      const project = await this.projectService.getProjectById(
        projectId,
        cognitoSub
      );
      if (!project || project.error) {
        this.logger.error("Project not found or access denied");
        return this.createResponse(404, {
          message: "Project not found or access denied.",
        });
      }

      const user = await this.userService.findUserByCognitoSub(cognitoSub);
      if (!user || user.error) {
        this.logger.error("User not found or access denied");
        return this.createResponse(404, {
          message: "User not found or access denied.",
        });
      }

      // Extract tenant from user
      const tenant = user.name;

      const secret = await this.secretService.getSecretByProvider(
        tenant,
        projectId,
        provider
      );
      if (secret.error) {
        this.logger.error("Error getting secret by provider:", secret.message);
        return this.createResponse(500, { message: secret.message });
      }

      this.logger.info("Secret by provider fetched successfully:", secret);
      return this.createResponse(200, {
        message: "Secret by provider fetched successfully.",
        data: secret,
      });
    } catch (error) {
      this.logger.error(
        "Error in getSecretByProvider handler:",
        JSON.stringify(error)
      );
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }
}
