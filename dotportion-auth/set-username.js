// import { createDBHandler } from "../layers/common/nodejs/utils/db.js";
// import UserModel from "../layers/common/nodejs/models/UserModel.js";
// import logger from "../layers/common/nodejs/utils/logger.js";
// import { createResponse } from "../layers/common/nodejs/utils/api.js";
import { createDBHandler } from "/opt/nodejs/utils/db.js";
import logger from "/opt/nodejs/utils/logger.js";
import { createResponse } from "/opt/nodejs/utils/api.js";
import UserModel from "/opt/nodejs/models/UserModel.js";
import { OAuthService } from "./service/oauth-service.js";
import { OAuthController } from "./controller/oauth-controller.js";

const { MONGO_URI, MDataBase, JWT_SECRET } = process.env;
const dbHandler = createDBHandler(MONGO_URI, MDataBase, logger);

export const handler = async (event) => {
  try {
    const oauthService = new OAuthService(
      dbHandler,
      UserModel,
      logger,
      null,
      JWT_SECRET
    );
    const oauthController = new OAuthController(
      oauthService,
      logger,
      createResponse
    );

    return await oauthController.setUsername(event);
  } catch (error) {
    logger.error("--- UNHANDLED FATAL ERROR in handler ---", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "A fata internal server error occured.",
      }),
    };
  }
};
