import { DBHandler } from "./utils/dbconnector.js";
import logger from "./utils/logger.js";
import { createResponse } from "./utils/api.js";
import { WaitlistService } from "./services/waitlist-service.js";
import { WaitlistController } from "./controllers/waitlist-controller.js";
import { EmailService } from "./services/email-service.js";
import nodemailer from "nodemailer";

const { MONGO_URI, MDataBase, ZOHO_PORT, ZOHO_HOST, AUTH_MAIL, AUTH_PASSWORD } =
  process.env;

const dbHandler = new DBHandler(MONGO_URI, MDataBase, logger);

export const handler = async (event) => {
  try {
    logger.info("<-- Received request to waitlist Handler");

    const waitlistService = new WaitlistService(dbHandler, logger);
    const emailService = new EmailService(
      logger,
      nodemailer,
      ZOHO_HOST,
      ZOHO_PORT,
      AUTH_MAIL,
      AUTH_PASSWORD,
      dbHandler
    );
    const waitlistController = new WaitlistController(
      waitlistService,
      logger,
      createResponse,
      emailService
    );
    return await waitlistController.AddWaitlist(event);
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
