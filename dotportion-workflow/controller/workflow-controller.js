// import { createLog } from "../../layers/common/nodejs/utils/activityLogger.js";
import { createLog } from "../opt/nodejs/utils/activityLogger.js";
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
    const userId = event.requestContext.authorizer.userId;
    const body =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body || {};
    try {
      this.logger.info(
        "--> createWorkflow controller invoked with event:",
        event
      );

      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        createLog({
          userId: userId || null,
          action: "create workflow",
          type: "warn",
          metadata: {
            request: body,
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

      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        createLog({
          userId: userId || null,
          action: "create workflow",
          type: "warn",
          metadata: {
            request: "Body is not defined",
            response: {
              status: 400,
              message: "Request body is missing.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, { error: "Request body is missing." });
      }
      this.logger.info(`Received request body: ${JSON.stringify(body)}`);
      const { projectId } = event.pathParameters;

      // const workflowData = JSON.parse(body);

      if (!projectId) {
        this.logger.error(
          "Validation failed: Missing projectId in request Path Parameters."
        );
        createLog({
          userId: userId || null,
          action: "create workflow",
          type: "warn",
          metadata: {
            request: body,
            response: {
              status: 400,
              message: "ProjectId is missing in request Path Parameters.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, {
          error: "ProjectId is missing in request Path Parameters.",
        });
      }

      // Verify that the project exists and belongs to the user
      const project = await this.projectService.getProjectById(
        projectId,
        userId
      );
      if (!project || project.error) {
        this.logger.error("Project not found or access denied");
        createLog({
          userId: userId || null,
          action: "create workflow",
          type: "warn",
          metadata: {
            request: { body, projectId },
            response: {
              status: 404,
              message: "Project not found or access denied.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(404, {
          message: "Project not found or access denied.",
        });
      }

      // Extract tenant from project or use a default
      const tenant = event.requestContext.authorizer.name;
      if (!tenant) {
        this.logger.error(
          "tenant not found in the event. Check authorizer configuration."
        );
        createLog({
          userId: userId || null,
          action: "create workflow",
          type: "warn",
          metadata: {
            request: { body, projectId },
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

      // Create the workflow
      const workflow = await this.workflowService.createWorkflow(
        body,
        projectId,
        userId,
        tenant
      );

      if (workflow.error) {
        this.logger.error("Error creating workflow:", workflow.message);
        createLog({
          userId: userId || null,
          action: "create workflow",
          type: "error",
          metadata: {
            request: { body, projectId },
            response: { status: 500, error: workflow.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
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
        createLog({
          userId: userId || null,
          action: "create workflow",
          type: "error",
          metadata: {
            request: { body, projectId },
            response: { status: 500, error: updatedProject.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(500, { message: updatedProject.message });
      }

      this.logger.info(
        "Workflow created and added to project successfully:",
        workflow
      );
      createLog({
        userId: userId || null,
        action: "create workflow",
        type: "info",
        metadata: {
          request: body,
          response: {
            statusCode: 200,
            message: "Workflow created and added to project successfully.",
            data: workflow,
          },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
      return this.createResponse(201, {
        message: "Workflow created and added to project successfully.",
        data: workflow,
      });
    } catch (error) {
      this.logger.error(
        "Error in createWorkflow handler:",
        JSON.stringify(error)
      );

      createLog({
        userId: userId,
        action: "create workflow",
        type: "error",
        metadata: {
          request: body,
          response: { error: error.message },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });

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

      // Verify that the project exists and belongs to the user
      const project = await this.projectService.getProjectById(
        projectId,
        userId
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
      const userId = event.requestContext.authorizer.userId;
      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }
      const { workflowId } = event.pathParameters;

      if (!workflowId) {
        this.logger.error("Validation failed: Missing workflowId.");
        return this.createResponse(400, { error: "WorkflowId is missing." });
      }

      const workflow = await this.workflowService.getWorkflowById(
        workflowId,
        userId
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
    const userId = event.requestContext.authorizer.userId;
    const body =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body || {};
    const { workflowId } = event.pathParameters;
    try {
      this.logger.info(
        "--> updateWorkflow controller invoked with event:",
        event
      );

      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        createLog({
          userId: userId || null,
          action: "update workflow",
          type: "warn",
          metadata: {
            request: { body, workflowId },
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

      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        createLog({
          userId: userId || null,
          action: "update workflow",
          type: "warn",
          metadata: {
            request: "Body is not defined",
            response: {
              status: 400,
              message: "Request body is missing.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, { error: "Request body is missing." });
      }
      this.logger.info(`Received request body: ${JSON.stringify(body)}`);

      if (!workflowId) {
        this.logger.error("Validation failed: Missing workflowId.");
        createLog({
          userId: userId || null,
          action: "update workflow",
          type: "warn",
          metadata: {
            request: body,
            response: {
              status: 400,
              message: "WorkflowId is missing.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, { error: "WorkflowId is missing." });
      }

      // const workflowData = JSON.parse(body);

      const result = await this.workflowService.updateWorkflow(
        workflowId,
        userId,
        body
      );
      if (result.error) {
        this.logger.error("Error updating workflow:", result.message);
        createLog({
          userId: userId || null,
          action: "update workflow",
          type: "error",
          metadata: {
            request: { body, workflowId },
            response: { status: 500, error: result.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(500, { message: result.message });
      }

      if (!result) {
        createLog({
          userId: userId || null,
          action: "update workflow",
          type: "warn",
          metadata: {
            request: { body, workflowId },
            response: {
              status: 404,
              message: "workflow not found or access denied.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(404, {
          message: "Workflow not found or access denied.",
        });
      }

      this.logger.info("Workflow updated successfully:", result);
      createLog({
        userId: userId || null,
        action: "update workflow",
        type: "info",
        metadata: {
          request: { body, workflowId },
          response: {
            statusCode: 200,
            message: "Workflow updated successfully.",
            data: result,
          },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
      return this.createResponse(200, {
        message: "Workflow updated successfully.",
        data: result,
      });
    } catch (error) {
      this.logger.error(
        "Error in updateWorkflow handler:",
        JSON.stringify(error)
      );
      createLog({
        userId: userId,
        action: "update workflow",
        type: "error",
        metadata: {
          request: { body, workflowId },
          response: { error: error.message },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }

  async deleteWorkflow(event) {
    const userId = event.requestContext.authorizer.userId;
    const { workflowId } = event.pathParameters;

    const body =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body || {};
    try {
      this.logger.info(
        "--> deleteWorkflow controller invoked with event:",
        event
      );
      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        createLog({
          userId: userId || null,
          action: "delete workflow",
          type: "warn",
          metadata: {
            request: { body, workflowId },
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

      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        createLog({
          userId: userId || null,
          action: "delete workflow",
          type: "warn",
          metadata: {
            request: "Body is not defined",
            response: {
              status: 400,
              message: "Request body is missing.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, { error: "Request body is missing." });
      }
      this.logger.info(`Received request body: ${JSON.stringify(body)}`);

      if (!workflowId) {
        this.logger.error("Validation failed: Missing workflowId.");
        createLog({
          userId: userId || null,
          action: "delete workflow",
          type: "warn",
          metadata: {
            request: body,
            response: {
              status: 400,
              message: "WorkflowId is missing.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, { error: "WorkflowId is missing." });
      }

      // First get the workflow to find its project
      const workflow = await this.workflowService.getWorkflowById(
        workflowId,
        userId
      );
      if (workflow.error) {
        this.logger.error("Error getting workflow:", workflow.message);
        createLog({
          userId: userId || null,
          action: "delete workflow",
          type: "error",
          metadata: {
            request: { body, workflowId },
            response: { status: 500, error: workflow.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(500, { message: workflow.message });
      }

      if (!workflow) {
        createLog({
          userId: userId || null,
          action: "delete workflow",
          type: "warn",
          metadata: {
            request: { body, workflowId },
            response: {
              status: 404,
              message: "workflow not found or access denied.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(404, {
          message: "Workflow not found or access denied.",
        });
      }

      // Delete the workflow
      const result = await this.workflowService.deleteWorkflow(
        workflowId,
        userId
      );
      if (result.error) {
        this.logger.error("Error deleting workflow:", result.message);
        createLog({
          userId: userId || null,
          action: "delete workflow",
          type: "error",
          metadata: {
            request: { body, workflowId },
            response: { status: 500, error: result.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
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
        createLog({
          userId: userId || null,
          action: "delete workflow",
          type: "error",
          metadata: {
            request: { body, projectId },
            response: { status: 500, error: updatedProject.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        // Don't fail the request if removing from project fails, just log it
        this.logger.warn("Workflow deleted but failed to remove from project");
      }

      this.logger.info("Workflow deleted successfully:", result);
      createLog({
        userId: userId,
        action: "delete workflow",
        type: "info",
        metadata: {
          request: { body, workflow },
          response: {
            statusCode: 200,
            message: "Workflow deleted successfully.",
            data: result,
          },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
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
      createLog({
        userId: userId,
        action: "delete workflow",
        type: "error",
        metadata: {
          request: { body, workflowId },
          response: { error: error.message },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }

  async toggleWorkflowDeployment(event) {
    const userId = event.requestContext.authorizer.userId;
    const { workflowId } = event.pathParameters;

    try {
      this.logger.info(
        "--> toggleWorkflowDeployment controller invoked with event:",
        event
      );
      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        createLog({
          userId: userId || null,
          action: "toggle workflow deployment",
          type: "warn",
          metadata: {
            request: workflowId,
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

      if (!workflowId) {
        this.logger.error("Validation failed: Missing workflowId.");
        createLog({
          userId: userId || null,
          action: "toggle workflow deployment",
          type: "warn",
          metadata: {
            request: "Body not defined",
            response: {
              status: 400,
              message: "WorkflowId is missing.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, { error: "WorkflowId is missing." });
      }

      const result = await this.workflowService.toggleWorkflowDeployment(
        workflowId,
        userId
      );
      if (result.error) {
        this.logger.error(
          "Error toggling workflow deployment:",
          result.message
        );
        createLog({
          userId: userId || null,
          action: "toggle workflow deployment",
          type: "error",
          metadata: {
            request: workflowId,
            response: { status: 500, error: result.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(500, { message: result.message });
      }

      const action = result.deploymentAction;
      this.logger.info(`Workflow ${action} successfully:`, result);
      createLog({
        userId: userId,
        action: "toggle workflow deployment",
        type: "info",
        metadata: {
          request: workflowId,
          response: {
            statusCode: 200,
            message: `Workflow ${action} successfully.`,
            data: result,
          },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
      return this.createResponse(200, {
        message: `Workflow ${action} successfully.`,
        data: result,
      });
    } catch (error) {
      this.logger.error(
        "Error in toggleWorkflowDeployment handler:",
        JSON.stringify(error)
      );
      createLog({
        userId: userId,
        action: "toggle workflow deployment",
        type: "error",
        metadata: {
          request: workflowId,
          response: { error: error.message },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }

  async forkWorkflow(event) {
    const userId = event.requestContext.authorizer.userId;
    const { workflowId } = event.pathParameters;
    const body =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body || {};
    const { projectId } = body;

    try {
      this.logger.info(
        "--> forkWorkflow controller invoked with event:",
        event
      );

      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        createLog({
          userId: userId || null,
          action: "fork workflow",
          type: "warn",
          metadata: {
            request: { body, workflowId },
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

      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        createLog({
          userId: userId || null,
          action: "fork workflow",
          type: "warn",
          metadata: {
            request: "Body is not defined",
            response: {
              status: 400,
              message: "Request body is missing.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, { error: "Request body is missing." });
      }
      this.logger.info(`Received request body: ${JSON.stringify(body)}`);

      if (!workflowId) {
        this.logger.error("Missing workflowId in path parameters.");
        createLog({
          userId: userId || null,
          action: "fork workflow",
          type: "warn",
          metadata: {
            request: { body },
            response: {
              status: 400,
              message: "WorkflowId is missing.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, { error: "WorkflowId is missing." });
      }

      // Verify target project exists and belongs to user
      const project = await this.projectService.getProjectById(
        projectId,
        userId
      );
      if (!project || project.error) {
        this.logger.error("Project not found or access denied.");
        createLog({
          userId: userId || null,
          action: "fork workflow",
          type: "warn",
          metadata: {
            request: { body, workflowId },
            response: {
              status: 404,
              message: "Project not found or access denied.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(404, {
          message: "Project not found or access denied.",
        });
      }

      // Call service layer to fork the workflow
      const forked = await this.workflowService.forkWorkflow(
        workflowId,
        projectId,
        userId
      );

      if (forked.error) {
        this.logger.error("Error in forkWorkflow service:", forked.message);
        createLog({
          userId: userId || null,
          action: "fork workflow",
          type: "error",
          metadata: {
            request: { body, workflowId },
            response: {
              status: forked.statusCode || 500,
              error: forked.message,
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(forked.statusCode || 500, {
          message: forked.message,
        });
      }

      // Add forked workflow to the project
      const updatedProject = await this.projectService.addWorkflowToProject(
        projectId,
        forked._id
      );

      if (updatedProject.error) {
        this.logger.warn("Workflow forked but failed to add to project.");
        createLog({
          userId: userId || null,
          action: "fork workflow",
          type: "error",
          metadata: {
            request: { body, projectId },
            response: { status: 500, error: updatedProject.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(500, { message: updatedProject.message });
      }

      this.logger.info("Workflow forked successfully:", forked);
      createLog({
        userId: userId,
        action: "fork workflow",
        type: "info",
        metadata: {
          request: { body, workflowId, projectId },
          response: {
            statusCode: 200,
            message: "Workflow forked successfully.",
            project: updatedProject,
            forked_workflow: forked,
          },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });

      return this.createResponse(200, {
        success: true,
        message: "Workflow forked successfully.",
        data: forked,
      });
    } catch (error) {
      this.logger.error(
        "Error in forkWorkflow handler:",
        JSON.stringify(error)
      );
      createLog({
        userId: userId,
        action: "fork workflow",
        type: "error",
        metadata: {
          request: { body, workflowId, projectId },
          response: { error: error.message },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }

  async getWorkflowDocs(event) {
    try {
      this.logger.info("--> getWorkflowDocs controller is initialised");

      const userId = event.requestContext.authorizer.userId;
      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      const { workflowId } = event.pathParameters;
      if (!workflowId) {
        return this.createResponse(400, { error: "workflowId is missing." });
      }

      const result = await this.workflowService.getWorkflowDocs(
        workflowId,
        userId
      );

      if (result.error) {
        return this.createResponse(result.statusCode || 400, {
          message: result.message,
        });
      }

      return this.createResponse(200, { data: result });
    } catch (error) {
      this.logger.error(
        "Error in getWorkflowDocs controller",
        JSON.stringify(error)
      );
      return this.createResponse(500, {
        message: "Internal server error.",
      });
    }
  }
}
