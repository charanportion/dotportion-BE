import { createDBHandler } from "/opt/nodejs/utils/db.js";
import logger from "/opt/nodejs/utils/logger.js";
import { createResponse } from "/opt/nodejs/utils/api.js";
import UserModel from "/opt/nodejs/models/UserModel.js";
import WaitList from "/opt/nodejs/models/WaitListModel.js";
import { OAuthService } from "./service/oauth-service.js";
import { OAuthController } from "./controller/oauth-controller.js";

const {
  MONGO_URI,
  MDataBase,
  JWT_SECRET,
  BASE_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
} = process.env;
const dbHandler = createDBHandler(MONGO_URI, MDataBase, logger);

export const handler = async (event) => {
  try {
    const oauthService = new OAuthService(
      dbHandler,
      UserModel,
      logger,
      WaitList,
      JWT_SECRET,
      BASE_URL,
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET
    );
    const oauthController = new OAuthController(
      oauthService,
      logger,
      createResponse
    );

    return await oauthController.githubCallback(event);
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
