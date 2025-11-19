import { createDBHandler } from "../layers/common/nodejs/utils/db.js";
import logger from "../layers/common/nodejs/utils/logger.js";
import { createResponse } from "../layers/common/nodejs/utils/api.js";
import SecretModel from "../layers/common/nodejs/models/SecretModel.js";
// import { createDBHandler } from "/opt/nodejs/utils/db.js";
// import logger from "/opt/nodejs/utils/logger.js";
// import { createResponse } from "/opt/nodejs/utils/api.js";
// import SecretModel from "/opt/nodejs/models/SecretModel.js";
import { SchemaService } from "./service/schema-service.js";
import { SchemaController } from "./controller/schema-controller.js";
import { MongoSchemaHandler } from "./service/mongo-schema-handler.js";
import { PlatformSchemaHandler } from "./service/platform-schema-handler.js";

const { MONGO_URI, MDataBase } = process.env;

const dbHandler = createDBHandler(MONGO_URI, MDataBase, logger);

export const handler = async (event) => {
  try {
    logger.info("received Delete Schema event:", JSON.stringify(event));
    const schemaService = new SchemaService(
      dbHandler,
      logger,
      SecretModel,
      MongoSchemaHandler,
      PlatformSchemaHandler
    );
    const schemaController = new SchemaController(
      schemaService,
      logger,
      createResponse
    );

    return await schemaController.deleteSchema(event);
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
