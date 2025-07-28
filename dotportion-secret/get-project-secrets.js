import { createDBHandler } from "/opt/nodejs/utils/db.js";
import logger from "/opt/nodejs/utils/logger.js";
import { createResponse } from "/opt/nodejs/utils/api.js";
import ProjectModel from "/opt/nodejs/models/ProjectModel.js";
import SecretModel from "/opt/nodejs/models/SecretModel.js";
// import { createDBHandler } from "../layers/common/nodejs/utils/db.js";
// import logger from "../layers/common/nodejs/utils/logger.js";
// import { createResponse } from "../layers/common/nodejs/utils/api.js";
// import ProjectModel from "../layers/common/nodejs/models/ProjectModel.js";
// import SecretModel from "../layers/common/nodejs/models/SecretModel.js";
import { ProjectService } from "./service/project-service.js";
import { SecretService } from "./service/secret-service.js";
import { SecretController } from "./controller/secret-controller.js";

const { MONGO_URI, MDataBase } = process.env;

const dbHandler = createDBHandler(MONGO_URI, MDataBase, logger);

export const handler = async (event) => {
  try {
    logger.info("received Get Project Secrets event:", JSON.stringify(event));
    const projectService = new ProjectService(dbHandler, logger, ProjectModel);
    const secretService = new SecretService(dbHandler, logger, SecretModel);
    const secretController = new SecretController(
      secretService,
      projectService,
      logger,
      createResponse,
      null
    );

    return secretController.getProjectSecrets(event);
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
