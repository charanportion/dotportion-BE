export class DashboardService {
  constructor(
    dbHandler,
    logger,
    ProjectModel,
    WorkflowModel,
    LogModel,
    SecretModel
  ) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.ProjectModel = ProjectModel;
    this.WorkflowModel = WorkflowModel;
    this.LogModel = LogModel;
    this.SecretModel = SecretModel;
    this.logger.info(`-->Dashboard Service initialized`);
  }

  // 1. Total Counts
  async getTotalCounts(cognitoSub) {
    try {
      this.logger.info(
        `-->getTotalCounts service invoked with userId: ${cognitoSub}`
      );

      await this.dbHandler.connectDb();

      const [projects, workflows, secrets] = await Promise.all([
        this.ProjectModel.countDocuments({ owner: cognitoSub }),
        this.WorkflowModel.countDocuments({ owner: cognitoSub }),
        this.SecretModel.countDocuments({ owner: cognitoSub }),
      ]);

      // Get logs via their projects
      const userProjects = await this.ProjectModel.find({
        owner: cognitoSub,
      }).select("_id");
      const projectIds = userProjects.map((p) => p._id);

      const [totalLogs, successLogs] = await Promise.all([
        this.LogModel.countDocuments({ project: { $in: projectIds } }),
        this.LogModel.countDocuments({
          project: { $in: projectIds },
          status: "success",
        }),
      ]);

      return {
        totalProjects: projects,
        totalWorkflows: workflows,
        totalSecrets: secrets,
        totalApiCalls: totalLogs,
        successRate:
          totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 0,
      };
    } catch (error) {
      this.logger.error("Error in getTotalCounts service:", error);
      return { error: true, message: "Error getting total counts" };
    }
  }

  // 2. API Calls Over Time (last 7 days)
  async getApiCallsOverTime(cognitoSub) {
    try {
      this.logger.info(
        `-->getApiCallsOverTime service invoked with userId: ${cognitoSub}`
      );

      await this.dbHandler.connectDb();

      const userProjects = await this.ProjectModel.find({
        owner: cognitoSub,
      }).select("_id");
      const projectIds = userProjects.map((p) => p._id);

      const result = await this.LogModel.aggregate([
        { $match: { project: { $in: projectIds } } },
        {
          $group: {
            _id: {
              year: { $year: "$timestamp" },
              month: { $month: "$timestamp" },
              day: { $dayOfMonth: "$timestamp" },
            },
            totalCalls: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ]);

      return result.map((r) => ({
        date: `${r._id.year}-${r._id.month}-${r._id.day}`,
        calls: r.totalCalls,
      }));
    } catch (error) {
      this.logger.error("Error in getApiCallsOverTime service:", error);
      return { error: true, message: "Error getting API calls over time" };
    }
  }

  // 3. Top 5 Projects by API Calls
  async getTopProjectsByApiCalls(cognitoSub) {
    try {
      this.logger.info(
        `-->getTopProjectsByApiCalls service invoked with userId: ${cognitoSub}`
      );

      await this.dbHandler.connectDb();

      const projects = await this.ProjectModel.find({ owner: cognitoSub })
        .sort({ "stats.totalApiCalls": -1 })
        .limit(5)
        .select("name stats.totalApiCalls");

      return projects.map((p) => ({
        name: p.name,
        calls: p.stats?.totalApiCalls || 0,
      }));
    } catch (error) {
      this.logger.error("Error in getTopProjectsByApiCalls service:", error);
      return {
        error: true,
        message: "Error getting top projects by API calls",
      };
    }
  }

  // 4. Top 5 Workflows by API Calls
  async getTopWorkflowsByApiCalls(cognitoSub) {
    try {
      this.logger.info(
        `-->getTopWorkflowsByApiCalls service invoked with userId: ${cognitoSub}`
      );

      await this.dbHandler.connectDb();

      const workflows = await this.WorkflowModel.find({ owner: cognitoSub })
        .sort({ "stats.totalCalls": -1 })
        .limit(5)
        .select("name stats.totalCalls");

      return workflows.map((w) => ({
        name: w.name,
        calls: w.stats?.totalCalls || 0,
      }));
    } catch (error) {
      this.logger.error("Error in getTopWorkflowsByApiCalls service:", error);
      return {
        error: true,
        message: "Error getting top workflows by API calls",
      };
    }
  }

  // 5. Secrets by Provider
  async getSecretsByProvider(cognitoSub) {
    try {
      this.logger.info(
        `-->getSecretsByProvider service invoked with userId: ${cognitoSub}`
      );

      await this.dbHandler.connectDb();

      const result = await this.SecretModel.aggregate([
        { $match: { owner: cognitoSub } },
        { $group: { _id: "$provider", count: { $sum: 1 } } },
      ]);

      return result.map((r) => ({ provider: r._id, count: r.count }));
    } catch (error) {
      this.logger.error("Error in getSecretsByProvider service:", error);
      return { error: true, message: "Error getting secrets by provider" };
    }
  }

  // 6. Success vs Failed Calls
  async getSuccessVsFailedCalls(cognitoSub) {
    try {
      this.logger.info(
        `-->getSuccessVsFailedCalls service invoked with userId: ${cognitoSub}`
      );

      await this.dbHandler.connectDb();

      const userProjects = await this.ProjectModel.find({
        owner: cognitoSub,
      }).select("_id");
      const projectIds = userProjects.map((p) => p._id);

      const result = await this.LogModel.aggregate([
        { $match: { project: { $in: projectIds } } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const success = result.find((r) => r._id === "success")?.count || 0;
      const failed = result.find((r) => r._id === "error")?.count || 0;

      return { success, failed };
    } catch (error) {
      this.logger.error("Error in getSuccessVsFailedCalls service:", error);
      return { error: true, message: "Error getting success vs failed calls" };
    }
  }

  // 7. Requests by Method
  async getRequestsByMethod(cognitoSub) {
    try {
      this.logger.info(
        `-->getRequestsByMethod service invoked with userId: ${cognitoSub}`
      );

      await this.dbHandler.connectDb();

      const result = await this.WorkflowModel.aggregate([
        { $match: { owner: cognitoSub } },
        { $group: { _id: "$method", count: { $sum: 1 } } },
      ]);

      return result.map((r) => ({ method: r._id, count: r.count }));
    } catch (error) {
      this.logger.error("Error in getRequestsByMethod service:", error);
      return { error: true, message: "Error getting requests by method" };
    }
  }

  // Main method to get all dashboard data
  async getGlobalDashboardData(cognitoSub) {
    try {
      this.logger.info(
        `-->getDashboardData service invoked with userId: ${cognitoSub}`
      );

      if (!cognitoSub) {
        this.logger.warn("getDashboardData called without a userId.");
        return { error: true, message: "No User ID" };
      }

      const [
        counts,
        callsOverTime,
        topProjects,
        topWorkflows,
        secretsByProvider,
        successVsFailed,
        requestsByMethod,
      ] = await Promise.all([
        this.getTotalCounts(cognitoSub),
        this.getApiCallsOverTime(cognitoSub),
        this.getTopProjectsByApiCalls(cognitoSub),
        this.getTopWorkflowsByApiCalls(cognitoSub),
        this.getSecretsByProvider(cognitoSub),
        this.getSuccessVsFailedCalls(cognitoSub),
        this.getRequestsByMethod(cognitoSub),
      ]);

      // Check if any of the methods returned an error
      const results = [
        counts,
        callsOverTime,
        topProjects,
        topWorkflows,
        secretsByProvider,
        successVsFailed,
        requestsByMethod,
      ];
      const errors = results.filter((result) => result.error);

      if (errors.length > 0) {
        this.logger.error("Some dashboard methods failed:", errors);
        return {
          error: true,
          message: "Some dashboard data could not be retrieved",
        };
      }

      return {
        counts,
        callsOverTime,
        topProjects,
        topWorkflows,
        secretsByProvider,
        successVsFailed,
        requestsByMethod,
      };
    } catch (error) {
      this.logger.error("Error in getDashboardData service:", error);
      return { error: true, message: "Error getting dashboard data" };
    }
  }
}
