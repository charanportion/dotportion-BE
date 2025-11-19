import mongoose from "mongoose";

export class ProjectService {
  constructor(dbHandler, logger, ProjectModel) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.ProjectModel = ProjectModel;
    this.logger.info(`-->Project Service initialized in Secret Module`);
  }

  async getProjectById(projectId, userId) {
    try {
      this.logger.info(
        `-->getProjectById service invoked with projectId:`,
        projectId,
        `userId:`,
        userId
      );

      if (!projectId) {
        this.logger.warn("getProjectById called without a projectId.");
        return { error: true, message: "No Project Id" };
      }

      if (!userId) {
        this.logger.warn("getProjectById called without a userId.");
        return { error: true, message: "No Owner Data" };
      }

      await this.dbHandler.connectDb();

      // Convert string IDs to ObjectIds
      const projectObjectId = new mongoose.Types.ObjectId(projectId);
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // First check if project exists at all
      const projectExists = await this.ProjectModel.findOne({
        _id: projectObjectId,
      });

      if (!projectExists) {
        this.logger.warn(`Project not found with id: ${projectId}`);
        return { error: true, message: "Project not found" };
      }

      // Then check if it belongs to the user
      const project = await this.ProjectModel.findOne({
        _id: projectObjectId,
        owner: userObjectId,
      });

      if (!project) {
        this.logger.warn(
          `Project ${projectId} exists but doesn't belong to user ${userId}. Project owner: ${projectExists.owner}`
        );
        return { error: true, message: "Access denied to this project" };
      }

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

      // Convert string IDs to ObjectIds
      const projectObjectId = new mongoose.Types.ObjectId(projectId);
      const secretObjectId = new mongoose.Types.ObjectId(secretId);

      const project = await this.ProjectModel.findOneAndUpdate(
        { _id: projectObjectId },
        { $push: { secrets: secretObjectId } },
        { new: true }
      );

      if (!project) {
        return { error: true, message: "Project not found" };
      }

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

      // Convert string IDs to ObjectIds
      const projectObjectId = new mongoose.Types.ObjectId(projectId);
      const secretObjectId = new mongoose.Types.ObjectId(secretId);

      const project = await this.ProjectModel.findOneAndUpdate(
        { _id: projectObjectId },
        { $pull: { secrets: secretObjectId } },
        { new: true }
      );

      if (!project) {
        return { error: true, message: "Project not found" };
      }

      return project;
    } catch (error) {
      this.logger.error("Error in removeSecretFromProject service:", error);
      return { error: true, message: "Error removing Secret from project" };
    }
  }
}
