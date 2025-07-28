export class WorkflowService {
  constructor(dbHandler, logger, WorkflowModel) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.WorkflowModel = WorkflowModel;
    this.logger.info(`-->Workflow Service initialized`);
  }

  async createWorkflow(workflowData, projectId, cognitoSub, tenant) {
    try {
      this.logger.info(
        `-->createWorkflow service invoked with workflowData:`,
        workflowData
      );
      if (!projectId) {
        this.logger.warn("createWorkflow called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      if (!cognitoSub) {
        this.logger.warn("createWorkflow called without a cognitoSub.");
        return { error: true, message: "No Cognito Sub" };
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
        owner: cognitoSub,
        tenant,
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
      const workflows = await this.WorkflowModel.find({ project: projectId });
      return workflows;
    } catch (error) {
      this.logger.error("Error in getWorkflowsByProjectId service:", error);
      return { error: true, message: "Error getting workflows" };
    }
  }

  async getWorkflowById(workflowId, cognitoSub) {
    try {
      this.logger.info(
        `-->getWorkflowById service invoked with workflowId:`,
        workflowId
      );
      if (!workflowId) {
        this.logger.warn("getWorkflowById called without a workflowId.");
        return { error: true, message: "No Workflow ID" };
      }
      if (!cognitoSub) {
        this.logger.warn("getWorkflowById called without a cognitoSub.");
        return { error: true, message: "No Owner Data" };
      }
      await this.dbHandler.connectDb();
      const workflow = await this.WorkflowModel.findOne({
        _id: workflowId,
        owner: cognitoSub,
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

  async updateWorkflow(workflowId, cognitoSub, workflowData) {
    try {
      this.logger.info(
        `-->updateWorkflow service invoked with workflowId:`,
        workflowId
      );
      if (!workflowId) {
        this.logger.warn("updateWorkflow called without a workflowId.");
        return { error: true, message: "No Workflow ID" };
      }
      if (!cognitoSub) {
        this.logger.warn("updateWorkflow called without a cognitoSub.");
        return { error: true, message: "No Owner Data" };
      }
      if (!workflowData) {
        this.logger.warn("updateWorkflow called without a workflowData.");
        return { error: true, message: "No Workflow Data" };
      }
      await this.dbHandler.connectDb();
      const workflow = await this.WorkflowModel.findOneAndUpdate(
        { _id: workflowId, owner: cognitoSub },
        workflowData,
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

  async deleteWorkflow(workflowId, cognitoSub) {
    try {
      this.logger.info(
        `-->deleteWorkflow service invoked with workflowId:`,
        workflowId
      );
      if (!workflowId) {
        this.logger.warn("deleteWorkflow called without a workflowId.");
        return { error: true, message: "No Workflow ID" };
      }
      if (!cognitoSub) {
        this.logger.warn("deleteWorkflow called without a cognitoSub.");
        return { error: true, message: "No Owner Data" };
      }
      await this.dbHandler.connectDb();
      const workflow = await this.WorkflowModel.findOneAndDelete({
        _id: workflowId,
        owner: cognitoSub,
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

  async toggleWorkflowDeployment(workflowId, cognitoSub) {
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
      if (!cognitoSub) {
        this.logger.warn(
          "toggleWorkflowDeployment called without a cognitoSub."
        );
        return { error: true, message: "No Owner Data" };
      }
      await this.dbHandler.connectDb();

      // First get the current workflow to check its deployment status
      const currentWorkflow = await this.WorkflowModel.findOne({
        _id: workflowId,
        owner: cognitoSub,
      });

      if (!currentWorkflow) {
        return { error: true, message: "Workflow not found or access denied" };
      }

      // Toggle the deployment status
      const newDeploymentStatus = !currentWorkflow.isDeployed;

      // Update workflow with toggled deployment status
      const workflow = await this.WorkflowModel.findOneAndUpdate(
        { _id: workflowId, owner: cognitoSub },
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
}
