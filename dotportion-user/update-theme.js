import { createDBHandler } from "/opt/nodejs/utils/db.js";
import logger from "/opt/nodejs/utils/logger.js";
import { createResponse } from "/opt/nodejs/utils/api.js";
import UserModel from "/opt/nodejs/models/UserModel.js";

// import { createDBHandler } from "../layers/common/nodejs/utils/db.js";
// import UserModel from "../layers/common/nodejs/models/UserModel.js";
// import logger from "../layers/common/nodejs/utils/logger.js";
// import { createResponse } from "../layers/common/nodejs/utils/api.js";
import { UserService } from "../dotportion-user/service/user-service.js";
import { UserController } from "../dotportion-user/controller/user-controller.js";

const { MONGO_URI, MDataBase } = process.env;
const dbHandler = createDBHandler(MONGO_URI, MDataBase, logger);

export const handler = async (event) => {
  try {
    logger.info("--- Update Profile handler invoked ---");
    const userService = new UserService(dbHandler, logger, UserModel);
    const userController = new UserController(
      userService,
      logger,
      createResponse
    );

    return await userController.updateTheme(event);
  } catch (error) {
    logger.error("--- UNHANDLED FATAL ERROR in handler ---", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "A fatal internal server error occurred.",
      }),
    };
  }
};
