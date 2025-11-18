import { createDBHandler } from "../layers/common/nodejs/utils/db.js";
import logger from "../layers/common/nodejs/utils/logger.js";
import { createResponse } from "../layers/common/nodejs/utils/api.js";
import SecretModel from "../layers/common/nodejs/models/SecretModel.js";
// import { createDBHandler } from "/opt/nodejs/utils/db.js";
// import logger from "/opt/nodejs/utils/logger.js";
// import { createResponse } from "/opt/nodejs/utils/api.js";
// import SecretModel from "/opt/nodejs/models/SecretModel.js";
import { SecretService } from "./service/secret-service.js";
import { DbProviderFactory } from "./service/db-provider-factory.js";
import { ExternalDbController } from "./controller/external-db-controller.js";

const { MONGO_URI, MDataBase } = process.env;

const dbHandler = createDBHandler(MONGO_URI, MDataBase, logger);

export const handler = async (event) => {
  try {
    logger.info("received get Collections event:", JSON.stringify(event));

    const secretService = new SecretService(dbHandler, logger, SecretModel);
    const dbProviderFactory = new DbProviderFactory(logger);
    const externalDbController = new ExternalDbController(
      secretService,
      dbProviderFactory,
      logger,
      createResponse
    );

    return await externalDbController.createDocument(event);
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
