import { createDBHandler } from "../layers/common/nodejs/utils/db.js";
import logger from "../layers/common/nodejs/utils/logger.js";
import { createResponse } from "../layers/common/nodejs/utils/api.js";
import ProjectModel from "../layers/common/nodejs/models/ProjectModel.js";
import WorkflowModel from "../layers/common/nodejs/models/WorkflowModel.js";
import SecretModel from "../layers/common/nodejs/models/SecretModel.js";
import ExecutionLogModel from "../layers/common/nodejs/models/ExecutionLog.js";
// import { createDBHandler } from "/opt/nodejs/utils/db.js";
// import logger from "/opt/nodejs/utils/logger.js";
// import { createResponse } from "/opt/nodejs/utils/api.js";
// import ProjectModel from "/opt/nodejs/models/ProjectModel.js";
// import WorkflowModel from "/opt/nodejs/models/WorkflowModel.js";
// import SecretModel from "/opt/nodejs/models/SecretModel.js";
// import ExecutionLogModel from "/opt/nodejs/models/ExecutionLog.js";
import { DashboardService } from "./service/dashboard-service.js";
import { DashboardController } from "./controller/dashboard-controller.js";

const { MONGO_URI, MDataBase } = process.env;

const dbHandler = createDBHandler(MONGO_URI, MDataBase, logger);

export const handler = async (event) => {
  try {
    logger.info("received get global dashboard event:", JSON.stringify(event));
    const dashboardService = new DashboardService(
      dbHandler,
      logger,
      ProjectModel,
      WorkflowModel,
      ExecutionLogModel,
      SecretModel
    );
    const dashboardController = new DashboardController(
      dashboardService,
      logger,
      createResponse
    );

    return await dashboardController.getDashboardData(event);
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
