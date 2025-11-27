// import { createDBHandler } from "../layers/common/nodejs/utils/db.js";
// import logger from "../layers/common/nodejs/utils/logger.js";
// import { createResponse } from "../layers/common/nodejs/utils/api.js";
// import FeedbackModel from "../layers/common/nodejs/models/FeedbackModel.js";
import { createDBHandler } from "/opt/nodejs/utils/db.js";
import logger from "/opt/nodejs/utils/logger.js";
import { createResponse } from "/opt/nodejs/utils/api.js";
import FeedbackModel from "/opt/nodejs/models/FeedbackModel.js";
import { FeedbackController } from "./controller/feedback-controller.js";
import { FeedbackService } from "./service/feedback-service.js";

const { MONGO_URI, MDataBase } = process.env;

const dbHandler = createDBHandler(MONGO_URI, MDataBase, logger);

export const handler = async (event) => {
  try {
    logger.info("Received Create feedback event:", JSON.stringify(event));
    const feedbackService = new FeedbackService(
      dbHandler,
      logger,
      FeedbackModel
    );
    const feedbackController = new FeedbackController(
      feedbackService,
      logger,
      createResponse
    );
    return await feedbackController.createFeedback(event);
  } catch (error) {
    logger.error("--- UNHANDLED FATAL ERROR in handler ---", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "A fatal internal server error occured.",
      }),
    };
  }
};
