// import { createDBHandler } from "../layers/common/nodejs/utils/db.js";
// import logger from "../layers/common/nodejs/utils/logger.js";
// import { createResponse } from "../layers/common/nodejs/utils/api.js";
// import SchemaModel from "../layers/common/nodejs/models/SchemaModel.js";
// import SecretModel from "../layers/common/nodejs/models/SecretModel.js";
// import UserModel from "../layers/common/nodejs/models/UserModel.js";
import { createDBHandler } from "/opt/nodejs/utils/db.js";
import logger from "/opt/nodejs/utils/logger.js";
import { createResponse } from "/opt/nodejs/utils/api.js";
import SchemaModel from "/opt/nodejs/models/SchemaModel.js";
import SecretModel from "/opt/nodejs/models/SecretModel.js";
import UserModel from "/opt/nodejs/models/UserModel.js";
import { SchemaCanvasService } from "./service/schema-canvas-service.js";
import { SchemaCanvasController } from "./controller/schema-canvas-controller.js";
import { SecretService } from "./service/secret-service.js";
import { MongoSchemaHandler } from "./service/mongo-schema-handler.js";
import { PlatformSchemaHandler } from "./service/platform-schema-handler.js";
import { UserService } from "./service/user-service.js";

const { MONGO_URI, MDataBase } = process.env;

const dbHandler = createDBHandler(MONGO_URI, MDataBase, logger);

export const handler = async (event) => {
  try {
    logger.info(
      "received generate Schema canvas event:",
      JSON.stringify(event)
    );
    const schemaCanvasService = new SchemaCanvasService(
      dbHandler,
      logger,
      SchemaModel,
      MongoSchemaHandler,
      PlatformSchemaHandler
    );
    const secretService = new SecretService(dbHandler, logger, SecretModel);
    const userService = new UserService(dbHandler, logger, UserModel);
    const schemaCanvasController = new SchemaCanvasController(
      schemaCanvasService,
      logger,
      createResponse,
      secretService,
      userService
    );

    return await schemaCanvasController.generateSchema(event);
  } catch (err) {
    logger.error(
      `--- UNHANDLED FATAL ERROR in handler --- ${JSON.stringify(err)}`
    );
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
