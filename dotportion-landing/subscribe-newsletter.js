import { DBHandler } from "./utils/dbconnector.js";
import logger from "./utils/logger.js";
import { createResponse } from "./utils/api.js";
import { EmailService } from "./services/email-service.js";
import nodemailer from "nodemailer";
import { NewsLetterService } from "./services/newsletter-service.js";
import { NewsletterController } from "./controllers/newsletter-controller.js";
import {
  createUnsubscribeSuccessHtml,
  createUnsubscribeErrorHtml,
  createInvalidEmailHtml,
  createHtmlResponse,
} from "./utils/html-templates.js";
import { EmailTemplates } from "./utils/email-templates.js";

const { MONGO_URI, MDataBase, ZOHO_PORT, ZOHO_HOST, AUTH_MAIL, AUTH_PASSWORD } =
  process.env;

const dbHandler = new DBHandler(MONGO_URI, MDataBase, logger);
const emailService = new EmailService(
  logger,
  nodemailer,
  ZOHO_HOST,
  ZOHO_PORT,
  AUTH_MAIL,
  AUTH_PASSWORD,
  dbHandler
);
const emailTemplates = new EmailTemplates();

export const handler = async (event) => {
  try {
    logger.info("<-- Received request to Subscribe Newsletter Handler");
    logger.info(`Event: ${JSON.stringify(event)}`);

    const newsletterService = new NewsLetterService(dbHandler, logger);
    const newsletterController = new NewsletterController(
      newsletterService,
      logger,
      createResponse,
      emailService,
      createHtmlResponse,
      createUnsubscribeSuccessHtml,
      createUnsubscribeErrorHtml,
      createInvalidEmailHtml,
      emailTemplates
    );

    logger.info("About to call newsletterController.Subscribe");
    const result = await newsletterController.Subscribe(event);
    logger.info("newsletterController.Subscribe completed successfully");
    return result;
  } catch (error) {
    logger.error("--- UNHANDLED FATAL ERROR in handler ---", error);
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
