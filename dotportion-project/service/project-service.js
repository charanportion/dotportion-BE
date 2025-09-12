export class ProjectService {
  constructor(dbHandler, logger, ProjectModel, ExecutionLogModel, mongoose) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.ProjectModel = ProjectModel;
    this.ExecutionLogModel = ExecutionLogModel;
    this.mongoose = mongoose;
    this.logger.info(`-->Project Service initialized`);
  }

  async createProject(projectData, cognitoSub) {
    try {
      this.logger.info(
        `-->createProject service invoked with projectData:`,
        projectData
      );
      if (!cognitoSub) {
        this.logger.warn("createProject called without a cognitoSub.");
        return { error: true, message: "No Project Data" };
      }
      if (!projectData) {
        this.logger.warn("createProject called without a projectData.");
        return { error: true, message: "No Owner Data" };
      }
      await this.dbHandler.connectDb();
      const project = await this.ProjectModel.create({
        ...projectData,
        owner: cognitoSub,
      });
      return project;
    } catch (error) {
      this.logger.error("Error in createProject service:", error);
      return {
        error: true,
        message: `Error creating project: ${error.message}`,
      };
    }
  }

  async getProjectByOwner(cognitoSub) {
    try {
      this.logger.info(
        `-->getProjectByOwner service invoked with cognitoSub:`,
        cognitoSub
      );
      if (!cognitoSub) {
        this.logger.warn("getProjectByOwner called without a cognitoSub.");
        return { error: true, message: "No Owner Data" };
      }
      await this.dbHandler.connectDb();
      const projects = await this.ProjectModel.find({ owner: cognitoSub })
        .populate({
          path: "workflows",
          select: "name method path",
        })
        .populate({
          path: "secrets",
          select: "provider",
        })
        .populate({
          path: "stats.topWorkflows.workflowId",
          select: "name method path",
        });
      return projects;
    } catch (error) {
      this.logger.error(`Error in getProjectByOwner service: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      return {
        error: true,
        message: `Error getProjectByOwner: ${error.message}`,
      };
    }
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
      })
        .populate({
          path: "workflows",
          select: "name method path",
        })
        .populate({
          path: "secrets",
          select: "provider",
        })
        .populate({
          path: "stats.topWorkflows.workflowId",
          select: "name method path",
        });
      return project;
    } catch (error) {
      this.logger.error("Error in getProjectById service:", error);
      return { error: true, message: "Error getProjectById" };
    }
  }

  async updateProject(projectId, cognitoSub, projectData) {
    try {
      this.logger.info(
        `-->updateProject service invoked with projectId:`,
        projectId
      );
      if (!projectId) {
        this.logger.warn("updateProject called without a projectId.");
        return { error: true, message: "No Project Id" };
      }
      if (!cognitoSub) {
        this.logger.warn("updateProject called without a cognitoSub.");
        return { error: true, message: "No Owner Data" };
      }
      if (!projectData) {
        this.logger.warn("updateProject called without a projectData.");
        return { error: true, message: "No Owner Data" };
      }
      await this.dbHandler.connectDb();
      const project = await this.ProjectModel.findOneAndUpdate(
        { _id: projectId, owner: cognitoSub },
        projectData,
        { new: true }
      );
      return project;
    } catch (error) {
      this.logger.error("Error in updateProject service:", error);
      return { error: true, message: "Error update Project" };
    }
  }

  async deleteProject(projectId, cognitoSub) {
    try {
      this.logger.info(
        `-->deleteProject service invoked with projectId:`,
        projectId
      );
      if (!projectId) {
        this.logger.warn("deleteProject called without a projectId.");
        return { error: true, message: "No Project Id" };
      }
      if (!cognitoSub) {
        this.logger.warn("deleteProject called without a cognitoSub.");
        return { error: true, message: "No Owner Data" };
      }
      await this.dbHandler.connectDb();
      const project = await this.ProjectModel.findOneAndDelete({
        _id: projectId,
        owner: cognitoSub,
      });
      return project ? true : false;
    } catch (error) {
      this.logger.error("Error in deleteProject service:", error);
      return { error: true, message: "Error delete Project" };
    }
  }

  async getCallsOverTime(
    projectId,
    cognitoSub,
    rangeDays = 7,
    groupBy = "day",
    selectedDate = null
  ) {
    try {
      this.logger.info(
        `-->getCallsOverTime service invoked with projectId:`,
        projectId
      );
      if (!projectId) {
        this.logger.warn("getCallsOverTime called without a projectId.");
        return { error: true, message: "No Project Id" };
      }
      if (!cognitoSub) {
        this.logger.warn("getCallsOverTime called without a cognitoSub.");
        return { error: true, message: "No Owner Data" };
      }

      await this.dbHandler.connectDb();

      // First verify the project belongs to the user
      const project = await this.ProjectModel.findOne({
        _id: projectId,
        owner: cognitoSub,
      });

      if (!project) {
        this.logger.warn("Project not found or access denied");
        return { error: true, message: "Project not found or access denied" };
      }

      let matchStage = {
        project: new this.mongoose.Types.ObjectId(projectId),
      };

      if (selectedDate) {
        // For hourly: restrict to that day
        const start = new Date(selectedDate);
        const end = new Date(selectedDate);
        end.setDate(end.getDate() + 1);
        matchStage.createdAt = { $gte: start, $lt: end };
      } else {
        // For day/week: restrict to range
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - rangeDays);
        matchStage.createdAt = { $gte: startDate };
      }

      // Pick format based on groupBy
      let dateFormat = "%Y-%m-%d"; // day
      if (groupBy === "week") {
        dateFormat = "%Y-%U"; // week number of the year
      } else if (groupBy === "hour") {
        dateFormat = "%H:00"; // hour in 24h
      }

      const result = await this.ExecutionLogModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: dateFormat, date: "$createdAt" },
              },
              ...(groupBy === "week" && {
                year: { $year: "$createdAt" },
              }),
            },
            totalCalls: { $sum: 1 },
          },
        },
        {
          $sort: { "_id.date": 1 },
        },
        {
          $project: {
            _id: 0,
            label: "$_id.date",
            totalCalls: 1,
            ...(groupBy === "week" && { year: "$_id.year" }),
          },
        },
      ]);

      this.logger.info("Calls over time fetched successfully:", result);
      return result;
    } catch (error) {
      this.logger.error("Error in getCallsOverTime service:", error);
      return { error: true, message: "Error getting calls over time" };
    }
  }
}
