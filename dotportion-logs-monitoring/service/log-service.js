export class LogService {
  constructor(dbHandler, logger, ExecutionLogModel) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.ExecutionLogModel = ExecutionLogModel;
    this.logger.info(`-->Log Service initialized`);
  }

  getRetentionDays = (plan = "free") => {
    const RETENTION_PERIODS_IN_DAYS = {
      free: 7,
      pro: 30,
      enterprise: 365,
    };
    return RETENTION_PERIODS_IN_DAYS[plan] || 7;
  };

  async createExecutionLog(project, workflow, trigger, plan) {
    try {
      this.logger.info(
        `-->createExecutionLog service invoked with project:`,
        project
      );
      if (!project) {
        this.logger.warn("createExecutionLog called without a project.");
        return { error: true, message: "No Project Id" };
      }
      if (!workflow) {
        this.logger.warn("createExecutionLog called without a workflowId.");
        return { error: true, message: "No Workflow Id" };
      }
      if (!trigger) {
        this.logger.warn("createExecutionLog called without a trigger.");
        return { error: true, message: "No Trigger" };
      }
      if (!plan) {
        this.logger.warn("createExecutionLog called without a plan.");
        return { error: true, message: "No Plan" };
      }
      const retentionDays = this.getRetentionDays(plan);
      const expireAt = new Date();
      expireAt.setDate(expireAt.getDate() + retentionDays);
      await this.dbHandler.connectDb();

      const newLog = new this.ExecutionLogModel({
        project,
        workflow,
        trigger,
        status: "running", // A new log always starts as 'running'
        steps: [], // Steps start as an empty array
        expireAt, // Set the calculated expiration date
      });
      await newLog.save();
      return newLog.toObject();
    } catch (error) {
      this.logger.error("Error in createExecutionLog service:", error);
      return { error: true, message: "Error creating execution log" };
    }
  }

  async addNodeStepToLog(logId, stepData) {
    try {
      this.logger.info(
        `-->addNodeStepToLog service invoked with logId:`,
        logId
      );
      if (!logId) {
        this.logger.warn("addNodeStepToLog called without a logId.");
        return { error: true, message: "No Log Id" };
      }
      if (!stepData) {
        this.logger.warn("addNodeStepToLog called without a stepData.");
        return { error: true, message: "No Step Data" };
      }
      await this.dbHandler.connectDb();

      const updatedLog = await this.ExecutionLogModel.findByIdAndUpdate(
        logId,
        { $push: { steps: stepData } }, // Use $push to add the new step to the array
        { new: true } // Return the updated document
      ).lean();

      return updatedLog;
    } catch (error) {
      this.logger.error("Error in addNodeStepToLog service:", error);
      return { error: true, message: "Error adding node step to log" };
    }
  }

  async finalizeExecutionLog(logId, status, response, durationMs) {
    try {
      this.logger.info(
        `-->finalizeExecutionLog service invoked with logId:`,
        logId
      );
      if (!logId) {
        this.logger.warn("finalizeExecutionLog called without a logId.");
        return { error: true, message: "No Log Id" };
      }
      if (!status) {
        this.logger.warn("finalizeExecutionLog called without a status.");
        return { error: true, message: "No Status" };
      }
      if (!response) {
        this.logger.warn("finalizeExecutionLog called without a response.");
        return { error: true, message: "No Response" };
      }
      if (!durationMs) {
        this.logger.warn("finalizeExecutionLog called without a durationMs.");
        return { error: true, message: "No Duration" };
      }

      await this.dbHandler.connectDb();

      const finalizedLog = await this.ExecutionLogModel.findByIdAndUpdate(
        logId,
        { $set: { status, response, durationMs } },
        { new: true }
      ).lean();

      return finalizedLog;
    } catch (error) {
      this.logger.error("Error in addNodeStepToLog service:", error);
      return { error: true, message: "Error adding node step to log" };
    }
  }

  async deleteLogById(logId) {
    try {
      this.logger.info(`-->deleteLogById service invoked with logId:`, logId);
      if (!logId) {
        this.logger.warn("deleteLogById called without a logId.");
        return { error: true, message: "No Log Id" };
      }

      await this.dbHandler.connectDb();

      const result = await this.ExecutionLogModel.findByIdAndDelete(logId);
      return result;
    } catch (error) {
      this.logger.error("Error in addNodeStepToLog service:", error);
      return { error: true, message: "Error adding node step to log" };
    }
  }

  async getLogsByProjectId(projectId, limit = 10, page = 1) {
    try {
      this.logger.info(
        `-->getLogsByProjectId service invoked with projectId:`,
        projectId
      );
      if (!projectId) {
        this.logger.warn("getLogsByProjectId called without a projectId.");
        return { error: true, message: "No Project Id" };
      }
      if (limit < 1 || limit > 100) {
        this.logger.warn("getLogsByProjectId called with an invalid limit.");
        return { error: true, message: "Invalid Limit" };
      }
      if (page < 1) {
        this.logger.warn("getLogsByProjectId called with an invalid page.");
        return { error: true, message: "Invalid Page" };
      }
      await this.dbHandler.connectDb();

      const logs = await this.ExecutionLogModel.find({
        project: projectId,
      })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      return logs;
    } catch (error) {
      this.logger.error("Error in getLogsByProjectId service:", error);
      return { error: true, message: "Error getting logs by project id" };
    }
  }

  async getLogsByWorkflowId(workflowId, limit = 10, page = 1) {
    try {
      this.logger.info(
        `-->getLogsByWorkflowId service invoked with workflowId:`,
        workflowId
      );
      if (!workflowId) {
        this.logger.warn("getLogsByWorkflowId called without a workflowId.");
        return { error: true, message: "No Workflow Id" };
      }
      if (limit < 1 || limit > 100) {
        this.logger.warn("getLogsByWorkflowId called with an invalid limit.");
        return { error: true, message: "Invalid Limit" };
      }
      if (page < 1) {
        this.logger.warn("getLogsByWorkflowId called with an invalid page.");
        return { error: true, message: "Invalid Page" };
      }
      await this.dbHandler.connectDb();

      const logs = await this.ExecutionLogModel.find({
        workflow: workflowId,
      })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      return logs;
    } catch (error) {
      this.logger.error("Error in getLogsByWorkflowId service:", error);
      return { error: true, message: "Error getting logs by workflow id" };
    }
  }

  async getLogById(logId) {
    try {
      this.logger.info(`-->getLogById service invoked with logId:`, logId);
      if (!logId) {
        this.logger.warn("getLogById called without a logId.");
        return { error: true, message: "No Log Id" };
      }
      await this.dbHandler.connectDb();

      const log = await this.ExecutionLogModel.findById(logId).lean();
      return log;
    } catch (error) {
      this.logger.error("Error in getLogById service:", error);
      return { error: true, message: "Error getting log by id" };
    }
  }
}
