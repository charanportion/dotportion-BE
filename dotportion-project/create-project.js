import { createDBHandler } from "/opt/nodejs/utils/db.js";
import logger from "/opt/nodejs/utils/logger.js";
import { createResponse } from "/opt/nodejs/utils/api.js";
import ProjectModel from "/opt/nodejs/models/ProjectModel.js";
import LogModel from "/opt/nodejs/models/LogModel.js";
import WorkflowModel from "/opt/nodejs/models/WorkflowModel.js";
import SecretModel from "/opt/nodejs/models/SecretModel.js";
// import { createDBHandler } from "../layers/common/nodejs/utils/db.js";
// import logger from "../layers/common/nodejs/utils/logger.js";
// import { createResponse } from "../layers/common/nodejs/utils/api.js";
// import ProjectModel from "../layers/common/nodejs/models/ProjectModel.js";
// import LogModel from "../layers/common/nodejs/models/LogModel.js";
// import WorkflowModel from "../layers/common/nodejs/models/WorkflowModel.js";
// import SecretModel from "../layers/common/nodejs/models/SecretModel.js";
import { ProjectService } from "./service/project-service.js";
import { ProjectController } from "./controller/project-controller.js";
import mongoose from "mongoose";

const { MONGO_URI, MDataBase } = process.env;

const dbHandler = createDBHandler(MONGO_URI, MDataBase, logger);

export const handler = async (event) => {
  try {
    logger.info("received Create Project event:", JSON.stringify(event));
    const projectService = new ProjectService(
      dbHandler,
      logger,
      ProjectModel,
      LogModel,
      mongoose
    );
    const projectController = new ProjectController(
      projectService,
      logger,
      createResponse
    );

    return projectController.createProject(event);
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
