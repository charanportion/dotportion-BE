import { createDBHandler } from "../layers/common/nodejs/utils/db.js";
import UserModel from "../layers/common/nodejs/models/UserModel.js";
import otpModel from "../layers/common/nodejs/models/otpModel.js";
import logger from "../layers/common/nodejs/utils/logger.js";
import { createResponse } from "../layers/common/nodejs/utils/api.js";

// import { createDBHandler } from "/opt/nodejs/utils/db.js";
// import logger from "/opt/nodejs/utils/logger.js";
// import { createResponse } from "/opt/nodejs/utils/api.js";
// import UserModel from "/opt/nodejs/models/UserModel.js";
import { AuthService } from "./service/auth-service.js";
import { AuthController } from "./controller/auth-controller.js";
import { EmailService } from "./service/email-service.js";
import nodemailer from "nodemailer";

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
    logger.info("--- Resend OTP handler invoked ---");
    const emailService = new EmailService(
      logger,
      nodemailer,
      ZOHO_HOST,
      ZOHO_PORT,
      AUTH_MAIL,
      AUTH_PASSWORD,
      BASE_URL,
      dbHandler
    );
    const authService = new AuthService(
      dbHandler,
      logger,
      otpModel,
      UserModel,
      emailService
    );
    const authController = new AuthController(
      authService,
      logger,
      createResponse
    );

    return await authController.resendOtp(event);
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
