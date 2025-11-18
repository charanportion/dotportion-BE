// import { createDBHandler } from "/opt/nodejs/utils/db.js";
// import logger from "/opt/nodejs/utils/logger.js";
// import { createResponse } from "/opt/nodejs/utils/api.js";
// import ExecutionLogModel from "/opt/nodejs/models/ExecutionLog.js";
import { createDBHandler } from "../layers/common/nodejs/utils/db.js";
import logger from "../layers/common/nodejs/utils/logger.js";
import { createResponse } from "../layers/common/nodejs/utils/api.js";
import ExecutionLogModel from "../layers/common/nodejs/models/ExecutionLog.js";
import { LogService } from "./service/log-service.js";
import { LogController } from "./controller/log-controller.js";

const { MONGO_URI, MDataBase } = process.env;

const dbHandler = createDBHandler(MONGO_URI, MDataBase, logger);

export const handler = async (event) => {
  try {
    logger.info("received get workflow logs event:", JSON.stringify(event));

    const logService = new LogService(dbHandler, logger, ExecutionLogModel);
    const logController = new LogController(logService, logger, createResponse);

    return logController.getLogsByWorkflowId(event);
  } catch (err) {
    logger.error("--- UNHANDLED FATAL ERROR in handler ---", err);
    // This is a fallback error response.
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "A fatal internal server error occurred.",
      }),
    };
  }
};
