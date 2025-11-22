export class WorkflowService {
  constructor(dbHandler, logger, WorkflowModel) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.WorkflowModel = WorkflowModel;
    this.logger.info(`-->Workflow Service initialized`);
  }

  async createWorkflow(workflowData, projectId, userId, tenant) {
    try {
      this.logger.info(
        `-->createWorkflow service invoked with workflowData:`,
        workflowData
      );
      if (!projectId) {
        this.logger.warn("createWorkflow called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      if (!userId) {
        this.logger.warn("createWorkflow called without a userId.");
        return { error: true, message: "No UserId" };
      }
      if (!tenant) {
        this.logger.warn("createWorkflow called without a tenant.");
        return { error: true, message: "No Tenant" };
      }
      if (!workflowData) {
        this.logger.warn("createWorkflow called without a workflowData.");
        return { error: true, message: "No Workflow Data" };
      }
      await this.dbHandler.connectDb();
      const workflow = await this.WorkflowModel.create({
        ...workflowData,
        project: projectId,
        owner: userId,
        tenant,
        isPublic: false,
        visibility: "private",
      });
      return workflow;
    } catch (error) {
      this.logger.error("Error in createWorkflow service:", error);
      return { error: true, message: "Error creating workflow" };
    }
  }

  async getWorkflowsByProjectId(projectId) {
    try {
      this.logger.info(
        `-->getWorkflowsByProjectId service invoked with projectId:`,
        projectId
      );
      if (!projectId) {
        this.logger.warn("getWorkflowsByProjectId called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      await this.dbHandler.connectDb();
      const workflows = await this.WorkflowModel.find({
        project: projectId,
      });
      return workflows;
    } catch (error) {
      this.logger.error("Error in getWorkflowsByProjectId service:", error);
      return { error: true, message: "Error getting workflows" };
    }
  }

  async getWorkflowById(workflowId, userId) {
    try {
      this.logger.info(
        `-->getWorkflowById service invoked with workflowId:`,
        workflowId
      );
      if (!workflowId) {
        this.logger.warn("getWorkflowById called without a workflowId.");
        return { error: true, message: "No Workflow ID" };
      }
      if (!userId) {
        this.logger.warn("getWorkflowById called without a userId.");
        return { error: true, message: "No Owner Data" };
      }
      await this.dbHandler.connectDb();
      const workflow = await this.WorkflowModel.findOne({
        _id: workflowId,
        $or: [{ owner: userId }],
      });
      if (!workflow) {
        return { error: true, message: "Workflow not found or access denied" };
      }
      return workflow;
    } catch (error) {
      this.logger.error("Error in getWorkflowById service:", error);
      return { error: true, message: "Error getting workflow" };
    }
  }

  async updateWorkflow(workflowId, userId, workflowData) {
    try {
      this.logger.info(
        `-->updateWorkflow service invoked with workflowId:`,
        workflowId
      );
      if (!workflowId) {
        this.logger.warn("updateWorkflow called without a workflowId.");
        return { error: true, message: "No Workflow ID" };
      }
      if (!userId) {
        this.logger.warn("updateWorkflow called without a userId.");
        return { error: true, message: "No Owner Data" };
      }
      if (!workflowData) {
        this.logger.warn("updateWorkflow called without a workflowData.");
        return { error: true, message: "No Workflow Data" };
      }
      await this.dbHandler.connectDb();
      const { forkedFrom, forkCount, ...allowedData } = workflowData;
      const workflow = await this.WorkflowModel.findOneAndUpdate(
        { _id: workflowId, owner: userId },
        allowedData,
        { new: true }
      );

      if (!workflow) {
        return { error: true, message: "Workflow not found or access denied" };
      }
      return workflow;
    } catch (error) {
      this.logger.error("Error in updateWorkflow service:", error);
      return { error: true, message: "Error updating workflow" };
    }
  }

  async deleteWorkflow(workflowId, userId) {
    try {
      this.logger.info(
        `-->deleteWorkflow service invoked with workflowId:`,
        workflowId
      );
      if (!workflowId) {
        this.logger.warn("deleteWorkflow called without a workflowId.");
        return { error: true, message: "No Workflow ID" };
      }
      if (!userId) {
        this.logger.warn("deleteWorkflow called without a userId.");
        return { error: true, message: "No Owner Data" };
      }
      await this.dbHandler.connectDb();
      const workflow = await this.WorkflowModel.findOneAndDelete({
        _id: workflowId,
        owner: userId,
      });
      if (!workflow) {
        return { error: true, message: "Workflow not found or access denied" };
      }
      return workflow;
    } catch (error) {
      this.logger.error("Error in deleteWorkflow service:", error);
      return { error: true, message: "Error deleting workflow" };
    }
  }

  async toggleWorkflowDeployment(workflowId, userId) {
    try {
      this.logger.info(
        `-->toggleWorkflowDeployment service invoked with workflowId:`,
        workflowId
      );
      if (!workflowId) {
        this.logger.warn(
          "toggleWorkflowDeployment called without a workflowId."
        );
        return { error: true, message: "No Workflow ID" };
      }
      if (!userId) {
        this.logger.warn("toggleWorkflowDeployment called without a userId.");
        return { error: true, message: "No Owner Data" };
      }
      await this.dbHandler.connectDb();

      // First get the current workflow to check its deployment status
      const currentWorkflow = await this.WorkflowModel.findOne({
        _id: workflowId,
        owner: userId,
      });

      if (!currentWorkflow) {
        return { error: true, message: "Workflow not found or access denied" };
      }

      // Toggle the deployment status
      const newDeploymentStatus = !currentWorkflow.isDeployed;

      // Update workflow with toggled deployment status
      const workflow = await this.WorkflowModel.findOneAndUpdate(
        { _id: workflowId, owner: userId },
        { isDeployed: newDeploymentStatus },
        { new: true }
      );

      // Here you would add deployment logic (e.g., creating Lambda functions, API Gateway routes, etc.)
      this.logger.info(
        `Workflow deployment toggled to: ${newDeploymentStatus}`
      );

      return {
        ...workflow.toObject(),
        deploymentAction: newDeploymentStatus ? "deployed" : "undeployed",
      };
    } catch (error) {
      this.logger.error("Error in toggleWorkflowDeployment service:", error);
      return { error: true, message: "Error toggling workflow deployment" };
    }
  }

  async forkWorkflow(workflowId, projectId, userId) {
    try {
      this.logger.info(
        `--> forkWorkflow service invoked with workflowId: ${workflowId} and projectId: ${projectId}`
      );

      if (!workflowId || !projectId || !userId) {
        return {
          error: true,
          message: "Missing required parameters",
          statusCode: 400,
        };
      }

      await this.dbHandler.connectDb();

      // Find source workflow
      const source = await this.WorkflowModel.findById(workflowId);
      if (!source) {
        return { error: true, message: "Workflow not found", statusCode: 404 };
      }

      // Validate fork permission (only public or template workflows)
      if (!source.isPublic && source.visibility !== "public") {
        return {
          error: true,
          message: "You cannot fork this workflow",
          statusCode: 403,
        };
      }

      // Create forked workflow
      const cloned = await this.WorkflowModel.create({
        name: `${source.name} (Forked)`,
        description: source.description,
        method: source.method,
        path: source.path,
        project: projectId,
        owner: userId,
        tenant: source.tenant,
        nodes: source.nodes,
        edges: source.edges,
        isPublic: false,
        visibility: "private",
        forkedFrom: source._id,
      });

      // Increment fork count on source workflow
      source.forkCount = (source.forkCount || 0) + 1;
      await source.save();

      return cloned;
    } catch (error) {
      this.logger.error("Error in forkWorkflow service:", error);
      return {
        error: true,
        message: "Error forking workflow",
        statusCode: 500,
      };
    }
  }
}
