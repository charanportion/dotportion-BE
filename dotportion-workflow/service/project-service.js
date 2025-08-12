export class ProjectService {
  constructor(dbHandler, logger, ProjectModel) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.ProjectModel = ProjectModel;
    this.logger.info(`-->Project Service initialized in Workflow Module`);
  }

  async getProjectById(projectId, cognitoSub) {
    try {
      this.logger.info(
        `-->getProjectById service invoked with projectId:`,
        projectId
      );
      if (!projectId) {
        this.logger.warn("getProjectById called without a projectId.");
        return { error: true, message: "No Project Id" };
      }
      if (!cognitoSub) {
        this.logger.warn("getProjectById called without a cognitoSub.");
        return { error: true, message: "No Owner Data" };
      }
      await this.dbHandler.connectDb();
      const project = await this.ProjectModel.findOne({
        _id: projectId,
        owner: cognitoSub,
      });
      return project;
    } catch (error) {
      this.logger.error("Error in getProjectById service:", error);
      return { error: true, message: "Error getting project" };
    }
  }

  async addWorkflowToProject(projectId, workflowId) {
    try {
      this.logger.info(
        `-->addWorkflowToProject service invoked with projectId:`,
        projectId
      );
      if (!projectId) {
        this.logger.warn("addWorkflowToProject called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      if (!workflowId) {
        this.logger.warn("addWorkflowToProject called without a workflowId.");
        return { error: true, message: "No Workflow ID" };
      }
      await this.dbHandler.connectDb();
      const project = await this.ProjectModel.findOneAndUpdate(
        { _id: projectId },
        { $push: { workflows: workflowId } },
        { new: true }
      );
      return project;
    } catch (error) {
      this.logger.error("Error in addWorkflowToProject service:", error);
      return { error: true, message: "Error adding workflow to project" };
    }
  }

  async removeWorkflowFromProject(projectId, workflowId) {
    try {
      this.logger.info(
        `-->removeWorkflowFromProject service invoked with projectId:`,
        projectId
      );
      if (!projectId) {
        this.logger.warn(
          "removeWorkflowFromProject called without a projectId."
        );
        return { error: true, message: "No Project ID" };
      }
      if (!workflowId) {
        this.logger.warn(
          "removeWorkflowFromProject called without a workflowId."
        );
        return { error: true, message: "No Workflow ID" };
      }
      await this.dbHandler.connectDb();
      const project = await this.ProjectModel.findOneAndUpdate(
        { _id: projectId },
        { $pull: { workflows: workflowId } },
        { new: true }
      );
      return project;
    } catch (error) {
      this.logger.error("Error in removeWorkflowFromProject service:", error);
      return { error: true, message: "Error removing workflow from project" };
    }
  }
}
