import { createDBHandler } from "/opt/nodejs/utils/db.js";
import logger from "/opt/nodejs/utils/logger.js";
import { createResponse } from "/opt/nodejs/utils/api.js";
import ProjectModel from "/opt/nodejs/models/ProjectModel.js";
import WorkflowModel from "/opt/nodejs/models/WorkflowModel.js";
// import { createDBHandler } from "../layers/common/nodejs/utils/db.js";
// import logger from "../layers/common/nodejs/utils/logger.js";
// import { createResponse } from "../layers/common/nodejs/utils/api.js";
// import ProjectModel from "../layers/common/nodejs/models/ProjectModel.js";
// import WorkflowModel from "../layers/common/nodejs/models/WorkflowModel.js";
import { ProjectService } from "./service/project-service.js";
import { WorkflowService } from "./service/workflow-service.js";
import { WorkflowController } from "./controller/workflow-controller.js";

const { MONGO_URI, MDataBase } = process.env;

const dbHandler = createDBHandler(MONGO_URI, MDataBase, logger);

export const handler = async (event) => {
  try {
    logger.info("received Update Workflow event:", JSON.stringify(event));
    const projectService = new ProjectService(dbHandler, logger, ProjectModel);
    const workflowService = new WorkflowService(
      dbHandler,
      logger,
      WorkflowModel
    );
    const workflowController = new WorkflowController(
      workflowService,
      projectService,
      logger,
      createResponse,
      null
    );

    return workflowController.updateWorkflow(event);
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
