export class FeedbackService {
  constructor(dbHandler, logger, FeedbackModel) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.FeedbackModel = FeedbackModel;
  }

  async createFeedback(data, userId) {
    try {
      this.logger.info("--> createFeedback service in invoked.");
      if (!userId) {
        this.logger.warn("createFeedback called without a userId.");
        return { error: true, message: "No userId", statusCode: 403 };
      }
      if (!data || !data.type || !data.message) {
        return {
          error: true,
          message: "Missing required fields",
          statusCode: 400,
        };
      }
      await this.dbHandler.connectDb();
      this.logger.info("DB connected - creating feedback");

      const feedback = await this.FeedbackModel.create({
        ...data,
        user: userId,
      });
      return feedback;
    } catch (error) {
      this.logger.error("Error in createFeedback service.", error);
      return { error: true, message: "Error creating feedback." };
    }
  }
}
