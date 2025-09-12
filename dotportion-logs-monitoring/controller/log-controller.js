export class LogController {
  constructor(logService, logger, createResponse) {
    this.logService = logService;
    this.logger = logger;
    this.createResponse = createResponse;
    this.logger.info(`-->Log Controller initialized`);
  }

  async createExecutionLog(event) {
    try {
      this.logger.info(
        `-->createExecutionLog controller invoked with event:`,
        event
      );
      const { body } = event;
      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        return this.createResponse(400, {
          error: "Request body is missing.",
        });
      }
      //   const logData = JSON.parse(body);
      // const logData = body;
      let logData;
      try {
        logData = JSON.parse(body);
      } catch (parseError) {
        this.logger.error("Error parsing request body:", parseError);
        return this.createResponse(400, {
          error: "Invalid JSON in request body.",
        });
      }
      this.logger.info(`Received request body: ${JSON.stringify(logData)}`);

      const { project, workflow, trigger, plan } = logData;

      if (!project) {
        this.logger.error(
          "Validation failed: Missing project in request body."
        );
        return this.createResponse(400, {
          error: "project is missing in request body.",
        });
      }

      if (!workflow) {
        this.logger.error(
          "Validation failed: Missing workflow in request body."
        );
        return this.createResponse(400, {
          error: "workflow is missing in request body.",
        });
      }
      if (!trigger) {
        this.logger.error(
          "Validation failed: Missing trigger in request body."
        );
        return this.createResponse(400, {
          error: "trigger is missing in request body.",
        });
      }
      if (!plan) {
        this.logger.error("Validation failed: Missing plan in request body.");
        return this.createResponse(400, {
          error: "plan is missing in request body.",
        });
      }

      const newLog = await this.logService.createExecutionLog(
        project,
        workflow,
        trigger,
        plan
      );
      return this.createResponse(201, { data: newLog });
    } catch (error) {
      this.logger.error(
        `Error in createExecutionLog controller: ${JSON.stringify(error)}`
      );
      return this.createResponse(500, {
        error: "Internal server error.",
      });
    }
  }

  async addNodeStepToLog(event) {
    try {
      this.logger.info(
        `-->addNodeStepToLog controller invoked with event:`,
        event
      );
      const { body } = event;
      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        return this.createResponse(400, {
          error: "Request body is missing.",
        });
      }
      //   const logData = JSON.parse(body);
      //   const logData = body;
      let logData;
      try {
        logData = JSON.parse(body);
      } catch (parseError) {
        this.logger.error("Error parsing request body:", parseError);
        return this.createResponse(400, {
          error: "Invalid JSON in request body.",
        });
      }
      this.logger.info(`Received request body: ${JSON.stringify(logData)}`);

      const { stepData } = logData;
      const { logId } = event.pathParameters;

      if (!logId) {
        this.logger.error("Validation failed: Missing logId in request body.");
        return this.createResponse(400, {
          error: "logId is missing in request body.",
        });
      }

      if (!stepData) {
        this.logger.error(
          "Validation failed: Missing stepData in request body."
        );
        return this.createResponse(400, {
          error: "stepData is missing in request body.",
        });
      }

      const updatedLog = await this.logService.addNodeStepToLog(
        logId,
        stepData
      );

      if (!updatedLog) {
        return this.createResponse(404, {
          message: "Log not found to add step.",
        });
      }
      return this.createResponse(201, { data: updatedLog });
    } catch (error) {
      this.logger.error(
        `Error in addNodeStepToLog controller: ${JSON.stringify(error)}`
      );
      return this.createResponse(500, {
        error: "Internal server error.",
      });
    }
  }

  async finalizeExecutionLog(event) {
    try {
      this.logger.info(
        `-->finalizeExecutionLog controller invoked with event:`,
        event
      );
      const { body } = event;
      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        return this.createResponse(400, {
          error: "Request body is missing.",
        });
      }
      //   const logData = JSON.parse(body);
      //   const logData = body;
      let logData;
      try {
        logData = JSON.parse(body);
      } catch (parseError) {
        this.logger.error("Error parsing request body:", parseError);
        return this.createResponse(400, {
          error: "Invalid JSON in request body.",
        });
      }
      this.logger.info(`Received request body: ${JSON.stringify(logData)}`);

      const { status, response, durationMs } = logData;
      const { logId } = event.pathParameters;

      if (!logId) {
        this.logger.error("Validation failed: Missing logId in request body.");
        return this.createResponse(400, {
          error: "logId is missing in request body.",
        });
      }

      if (!status) {
        this.logger.error("Validation failed: Missing status in request body.");
        return this.createResponse(400, {
          error: "status is missing in request body.",
        });
      }
      if (!response) {
        this.logger.error(
          "Validation failed: Missing response in request body."
        );
        return this.createResponse(400, {
          error: "response is missing in request body.",
        });
      }
      if (!durationMs) {
        this.logger.error(
          "Validation failed: Missing durationMs in request body."
        );
        return this.createResponse(400, {
          error: "durationMs is missing in request body.",
        });
      }

      const finalizedLog = await this.logService.finalizeExecutionLog(
        logId,
        status,
        response,
        durationMs
      );

      if (!finalizedLog) {
        return this.createResponse(404, {
          message: "Log not found to finalize.",
        });
      }
      return this.createResponse(201, { data: finalizedLog });
    } catch (error) {
      this.logger.error(
        `Error in finalizeExecutionLog controller: ${JSON.stringify(error)}`
      );
      return this.createResponse(500, {
        error: "Internal server error.",
      });
    }
  }

  async deleteLogById(event) {
    try {
      this.logger.info(
        `-->deleteLogById controller invoked with event:`,
        event
      );
      const { logId } = event.pathParameters;
      if (!logId) {
        this.logger.error("Validation failed: Missing logId in request path.");
        return this.createResponse(400, {
          error: "logId is missing in request path.",
        });
      }

      const deletedLog = await this.logService.deleteLogById(logId);

      if (!deletedLog) {
        return this.createResponse(404, {
          message: "Log not found to delete.",
        });
      }
      return this.createResponse(201, { data: deletedLog });
    } catch (error) {
      this.logger.error(
        `Error in deleteLogById controller: ${JSON.stringify(error)}`
      );
      return this.createResponse(500, {
        error: "Internal server error.",
      });
    }
  }

  async getLogsByProjectId(event) {
    try {
      this.logger.info(
        `-->getLogsByProjectId controller invoked with event:`,
        event
      );
      const { projectId } = event.pathParameters;
      const { limit, page } = event.queryStringParameters;

      if (!projectId) {
        this.logger.error(
          "Validation failed: Missing projectId in request path."
        );
        return this.createResponse(400, {
          error: "projectId is missing in request path.",
        });
      }

      const logs = await this.logService.getLogsByProjectId(
        projectId,
        limit,
        page
      );
      return this.createResponse(200, { data: logs });
    } catch (error) {
      this.logger.error(
        `Error in getLogsByProjectId controller: ${JSON.stringify(error)}`
      );
      return this.createResponse(500, {
        error: "Internal server error.",
      });
    }
  }

  async getLogsByWorkflowId(event) {
    try {
      this.logger.info(
        `-->getLogsByWorkflowId controller invoked with event: ${JSON.stringify(
          event
        )}`
      );
      const { workflowId } = event.pathParameters;
      const { limit, page } = event.queryStringParameters;

      if (!workflowId) {
        this.logger.error(
          "Validation failed: Missing workflowId in request path."
        );
        return this.createResponse(400, {
          error: "workflowId is missing in request path.",
        });
      }

      const logs = await this.logService.getLogsByWorkflowId(
        workflowId,
        limit,
        page
      );
      return this.createResponse(200, { data: logs });
    } catch (error) {
      this.logger.error(
        `Error in getLogsByWorkflowId controller: ${JSON.stringify(error)}`
      );
      return this.createResponse(500, {
        error: "Internal server error.",
      });
    }
  }

  async getLogById(event) {
    try {
      this.logger.info(`-->getLogById controller invoked with event:`, event);
      const { logId } = event.pathParameters;

      if (!logId) {
        this.logger.error("Validation failed: Missing logId in request path.");
        return this.createResponse(400, {
          error: "logId is missing in request path.",
        });
      }

      const log = await this.logService.getLogById(logId);

      if (!log) {
        return this.createResponse(404, {
          message: "Log not found.",
        });
      }
      return this.createResponse(200, { data: log });
    } catch (error) {
      this.logger.error(
        `Error in getLogById controller: ${JSON.stringify(error)}`
      );
      return this.createResponse(500, {
        error: "Internal server error.",
      });
    }
  }
}
