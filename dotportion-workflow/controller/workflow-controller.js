export class WorkflowController {
  constructor(
    workflowService,
    projectService,
    logger,
    createResponse,
    userService
  ) {
    this.workflowService = workflowService;
    this.projectService = projectService;
    this.logger = logger;
    this.createResponse = createResponse;
    this.userService = userService;
    this.logger.info(`-->Workflow Controller initialized`);
  }

  async createWorkflow(event) {
    try {
      this.logger.info(
        "--> createWorkflow controller invoked with event:",
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
      const workflowData = JSON.parse(body);

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

      // Extract tenant from project or use a default
      const tenant = user.name;

      // Create the workflow
      const workflow = await this.workflowService.createWorkflow(
        workflowData,
        projectId,
        cognitoSub,
        tenant
      );

      if (workflow.error) {
        this.logger.error("Error creating workflow:", workflow.message);
        return this.createResponse(500, { message: workflow.message });
      }

      // Add the workflow to the project
      const updatedProject = await this.projectService.addWorkflowToProject(
        projectId,
        workflow._id
      );

      if (updatedProject.error) {
        this.logger.error(
          "Error adding workflow to project:",
          updatedProject.message
        );
        return this.createResponse(500, { message: updatedProject.message });
      }

      this.logger.info(
        "Workflow created and added to project successfully:",
        workflow
      );
      return this.createResponse(201, {
        message: "Workflow created and added to project successfully.",
        data: workflow,
      });
    } catch (error) {
      this.logger.error(
        "Error in createWorkflow handler:",
        JSON.stringify(error)
      );
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }

  async getWorkflowsByProject(event) {
    try {
      this.logger.info(
        "--> getWorkflowsByProject controller invoked with event:",
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

      const workflows = await this.workflowService.getWorkflowsByProjectId(
        projectId
      );
      if (workflows.error) {
        this.logger.error("Error getting workflows:", workflows.message);
        return this.createResponse(500, { message: workflows.message });
      }

      this.logger.info("Workflows fetched successfully:", workflows);
      return this.createResponse(200, {
        message: "Workflows fetched successfully.",
        data: workflows,
      });
    } catch (error) {
      this.logger.error(
        "Error in getWorkflowsByProject handler:",
        JSON.stringify(error)
      );
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }

  async getWorkflow(event) {
    try {
      this.logger.info("--> getWorkflow controller invoked with event:", event);
      const cognitoSub = event.requestContext.authorizer.claims.sub;
      const { workflowId } = event.pathParameters;

      if (!cognitoSub) {
        this.logger.error(
          "Cognito 'sub' claim not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      if (!workflowId) {
        this.logger.error("Validation failed: Missing workflowId.");
        return this.createResponse(400, { error: "WorkflowId is missing." });
      }

      const workflow = await this.workflowService.getWorkflowById(
        workflowId,
        cognitoSub
      );
      if (workflow.error) {
        this.logger.error("Error getting workflow:", workflow.message);
        return this.createResponse(500, { message: workflow.message });
      }

      if (!workflow) {
        return this.createResponse(404, {
          message: "Workflow not found or access denied.",
        });
      }

      this.logger.info("Workflow fetched successfully:", workflow);
      return this.createResponse(200, {
        message: "Workflow fetched successfully.",
        data: workflow,
      });
    } catch (error) {
      this.logger.error("Error in getWorkflow handler:", JSON.stringify(error));
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }

  async updateWorkflow(event) {
    try {
      this.logger.info(
        "--> updateWorkflow controller invoked with event:",
        event
      );
      const cognitoSub = event.requestContext.authorizer.claims.sub;
      const { workflowId } = event.pathParameters;
      const { body } = event;

      if (!cognitoSub) {
        this.logger.error(
          "Cognito 'sub' claim not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      if (!workflowId) {
        this.logger.error("Validation failed: Missing workflowId.");
        return this.createResponse(400, { error: "WorkflowId is missing." });
      }

      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        return this.createResponse(400, { error: "Request body is missing." });
      }

      this.logger.info(`Received request body: ${JSON.stringify(body)}`);
      const workflowData = JSON.parse(body);

      const result = await this.workflowService.updateWorkflow(
        workflowId,
        cognitoSub,
        workflowData
      );
      if (result.error) {
        this.logger.error("Error updating workflow:", result.message);
        return this.createResponse(500, { message: result.message });
      }

      if (!result) {
        return this.createResponse(404, {
          message: "Workflow not found or access denied.",
        });
      }

      this.logger.info("Workflow updated successfully:", result);
      return this.createResponse(200, {
        message: "Workflow updated successfully.",
        data: result,
      });
    } catch (error) {
      this.logger.error(
        "Error in updateWorkflow handler:",
        JSON.stringify(error)
      );
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }

  async deleteWorkflow(event) {
    try {
      this.logger.info(
        "--> deleteWorkflow controller invoked with event:",
        event
      );
      const cognitoSub = event.requestContext.authorizer.claims.sub;
      const { workflowId } = event.pathParameters;

      if (!cognitoSub) {
        this.logger.error(
          "Cognito 'sub' claim not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      if (!workflowId) {
        this.logger.error("Validation failed: Missing workflowId.");
        return this.createResponse(400, { error: "WorkflowId is missing." });
      }

      // First get the workflow to find its project
      const workflow = await this.workflowService.getWorkflowById(
        workflowId,
        cognitoSub
      );
      if (workflow.error) {
        this.logger.error("Error getting workflow:", workflow.message);
        return this.createResponse(500, { message: workflow.message });
      }

      if (!workflow) {
        return this.createResponse(404, {
          message: "Workflow not found or access denied.",
        });
      }

      // Delete the workflow
      const result = await this.workflowService.deleteWorkflow(
        workflowId,
        cognitoSub
      );
      if (result.error) {
        this.logger.error("Error deleting workflow:", result.message);
        return this.createResponse(500, { message: result.message });
      }

      // Remove the workflow from the project
      const updatedProject =
        await this.projectService.removeWorkflowFromProject(
          workflow.project,
          workflowId
        );

      if (updatedProject.error) {
        this.logger.error(
          "Error removing workflow from project:",
          updatedProject.message
        );
        // Don't fail the request if removing from project fails, just log it
        this.logger.warn("Workflow deleted but failed to remove from project");
      }

      this.logger.info("Workflow deleted successfully:", result);
      return this.createResponse(200, {
        message: "Workflow deleted successfully.",
        data: {
          status: "success",
          workflow: result,
        },
      });
    } catch (error) {
      this.logger.error(
        "Error in deleteWorkflow handler:",
        JSON.stringify(error)
      );
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }

  async toggleWorkflowDeployment(event) {
    try {
      this.logger.info(
        "--> toggleWorkflowDeployment controller invoked with event:",
        event
      );
      const cognitoSub = event.requestContext.authorizer.claims.sub;
      const { workflowId } = event.pathParameters;

      if (!cognitoSub) {
        this.logger.error(
          "Cognito 'sub' claim not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      if (!workflowId) {
        this.logger.error("Validation failed: Missing workflowId.");
        return this.createResponse(400, { error: "WorkflowId is missing." });
      }

      const result = await this.workflowService.toggleWorkflowDeployment(
        workflowId,
        cognitoSub
      );
      if (result.error) {
        this.logger.error(
          "Error toggling workflow deployment:",
          result.message
        );
        return this.createResponse(500, { message: result.message });
      }

      const action = result.deploymentAction;
      this.logger.info(`Workflow ${action} successfully:`, result);
      return this.createResponse(200, {
        message: `Workflow ${action} successfully.`,
        data: result,
      });
    } catch (error) {
      this.logger.error(
        "Error in toggleWorkflowDeployment handler:",
        JSON.stringify(error)
      );
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }
}
