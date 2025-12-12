// import { createDBHandler } from "../layers/common/nodejs/utils/db.js";
// import logger from "../layers/common/nodejs/utils/logger.js";
// import { createResponse } from "../layers/common/nodejs/utils/api.js";
// import WaitList from "../layers/common/nodejs/models/WaitListModel.js";

import { createDBHandler } from "/opt/nodejs/utils/db.js";
import logger from "/opt/nodejs/utils/logger.js";
import { createResponse } from "/opt/nodejs/utils/api.js";
import WaitList from "/opt/nodejs/models/WaitListModel.js";
import nodemailer from "nodemailer";
import { AdminController } from "./controller/admin-controller.js";
import { AdminService } from "./service/admin-service.js";
import { EmailService } from "./service/email-service.js";

const {
  MONGO_URI,
  MDataBase,
  ZOHO_HOST,
  ZOHO_PORT,
  AUTH_MAIL,
  AUTH_PASSWORD,
  BASE_URL,
} = process.env;
const dbHandler = createDBHandler(MONGO_URI, MDataBase, logger);

export const handler = async (event) => {
  try {
    logger.info("--- Sign up handler invoked ---");
    const emailService = new EmailService(
      logger,
      nodemailer,
      ZOHO_HOST,
      ZOHO_PORT,
      AUTH_MAIL,
      AUTH_PASSWORD,
      BASE_URL
    );
    const adminService = new AdminService(
      dbHandler,
      WaitList,
      emailService,
      logger
    );
    const adminController = new AdminController(
      adminService,
      logger,
      createResponse
    );

    return await adminController.inviteUser(event);
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
