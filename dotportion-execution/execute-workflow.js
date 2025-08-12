// import { createDBHandler } from "../layers/common/nodejs/utils/db.js";
// import logger from "../layers/common/nodejs/utils/logger.js";
// import WorkflowModel from "../layers/common/nodejs/models/WorkflowModel.js";
// import ProjectModel from "../layers/common/nodejs/models/ProjectModel.js";
// import SecretModel from "../layers/common/nodejs/models/SecretModel.js";
import { createDBHandler } from "/opt/nodejs/utils/db.js";
import logger from "/opt/nodejs/utils/logger.js";
import WorkflowModel from "/opt/nodejs/models/WorkflowModel.js";
import ProjectModel from "/opt/nodejs/models/ProjectModel.js";
import SecretModel from "/opt/nodejs/models/SecretModel.js";
import { ExecutionService } from "./service/execution-service.js";
import { ExecutionController } from "./controller/execution-controller.js";

const { MONGO_URI, MDataBase } = process.env;
const dbHandler = createDBHandler(MONGO_URI, MDataBase, logger);

export const handler = async (event) => {
  const requestId = `lambda_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const executionService = new ExecutionService(
      dbHandler,
      logger,
      WorkflowModel,
      ProjectModel,
      SecretModel
    );

    const executionController = new ExecutionController(
      executionService,
      logger
    );

    const result = await executionController.executeWorkflow(event);

    logger.info(`[${requestId}] === Lambda Handler Completed Successfully ===`);
    logger.info(`[${requestId}] Response:`, {
      statusCode: result.statusCode,
      hasHeaders: !!result.headers,
      bodyLength: result.body?.length || 0,
    });

    return result;
  } catch (err) {
    logger.error(`[${requestId}] === UNHANDLED FATAL ERROR in handler ===`, {
      error: err.message,
      stack: err.stack,
      type: err.type,
      details: err.details,
    });

    // This is a fallback error response.
    const fallbackResponse = {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "A fatal internal server error occurred.",
        requestId: requestId,
        timestamp: new Date().toISOString(),
      }),
    };

    logger.info(`[${requestId}] Returning fallback error response:`, {
      statusCode: fallbackResponse.statusCode,
      bodyLength: fallbackResponse.body.length,
    });

    return fallbackResponse;
  }
};
