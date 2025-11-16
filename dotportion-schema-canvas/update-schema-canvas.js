// import { createDBHandler } from "../layers/common/nodejs/utils/db.js";
// import logger from "../layers/common/nodejs/utils/logger.js";
// import { createResponse } from "../layers/common/nodejs/utils/api.js";
// import SchemaModel from "../layers/common/nodejs/models/SchemaModel.js";
import { SchemaCanvasService } from "./service/schema-canvas-service.js";
import { SchemaCanvasController } from "./controller/schema-canvas-controller.js";
import { createDBHandler } from "/opt/nodejs/utils/db.js";
import logger from "/opt/nodejs/utils/logger.js";
import { createResponse } from "/opt/nodejs/utils/api.js";
import SchemaModel from "/opt/nodejs/models/SchemaModel.js";

const { MONGO_URI, MDataBase } = process.env;

const dbHandler = createDBHandler(MONGO_URI, MDataBase, logger);

export const handler = async (event) => {
  try {
    logger.info("received update Schema canvas event:", JSON.stringify(event));
    const schemaCanvasService = new SchemaCanvasService(
      dbHandler,
      logger,
      SchemaModel
    );
    const schemaCanvasController = new SchemaCanvasController(
      schemaCanvasService,
      logger,
      createResponse
    );

    return await schemaCanvasController.updateSchemaCanvas(event);
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
