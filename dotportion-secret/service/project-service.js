export class ProjectService {
  constructor(dbHandler, logger, ProjectModel) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.ProjectModel = ProjectModel;
    this.logger.info(`-->Project Service initialized in Secret Module`);
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

  async addSecretToProject(projectId, secretId) {
    try {
      this.logger.info(
        `-->addSecretToProject service invoked with projectId:`,
        projectId
      );
      if (!projectId) {
        this.logger.warn("addSecretToProject called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      if (!secretId) {
        this.logger.warn("addSecretToProject called without a secretId.");
        return { error: true, message: "No Secret ID" };
      }
      await this.dbHandler.connectDb();
      const project = await this.ProjectModel.findOneAndUpdate(
        { _id: projectId },
        { $push: { secrets: secretId } },
        { new: true }
      );
      return project;
    } catch (error) {
      this.logger.error("Error in addSecretToProject service:", error);
      return { error: true, message: "Error adding Secret to project" };
    }
  }

  async removeSecretFromProject(projectId, secretId) {
    try {
      this.logger.info(
        `-->removeSecretFromProject service invoked with projectId:`,
        projectId
      );
      if (!projectId) {
        this.logger.warn("removeSecretFromProject called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      if (!secretId) {
        this.logger.warn("removeSecretFromProject called without a secretId.");
        return { error: true, message: "No Secret ID" };
      }
      await this.dbHandler.connectDb();
      const project = await this.ProjectModel.findOneAndUpdate(
        { _id: projectId },
        { $pull: { secrets: secretId } },
        { new: true }
      );
      return project;
    } catch (error) {
      this.logger.error("Error in removeSecretFromProject service:", error);
      return { error: true, message: "Error removing Secret from project" };
    }
  }
}
