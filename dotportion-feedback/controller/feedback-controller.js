import { z } from "zod";

export class FeedbackController {
  constructor(feedbackService, logger, createResponse) {
    this.feedbackService = feedbackService;
    this.logger = logger;
    this.createResponse = createResponse;
    this.logger.info("--> Feedback controller initialised");
  }

  FeedbackBaseSchema = z.object({
    type: z.enum(["idea", "issue"]),
    message: z.string().min(1, "Message is required"),
    title: z.string().optional(),
  });

  IdeaSchema = this.FeedbackBaseSchema.extend({
    type: z.literal("idea"),
  });

  IssueSchema = this.FeedbackBaseSchema.extend({
    type: z.literal("issue"),
    project: z.string().min(1, "Project is required"),
    service: z.string().min(1, "Service is required"),
    severity: z.enum(["low", "medium", "high", "critical"]),
    subject: z.string().min(1, "Subject is required"),
  });

  FeedbackSchema = z.union([this.IdeaSchema, this.IssueSchema]);

  async createFeedback(event) {
    try {
      this.logger.info("--> CrreateFeedback controller invoked");
      const userId = event.requestContext.authorizer.userId;
      if (!userId) {
        this.logger.error(
          "UserId not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      const body =
        typeof event.body === "string"
          ? JSON.parse(event.body)
          : event.body || {};
      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        return this.createResponse(400, { error: "Request body is missing." });
      }
      this.logger.info(`Received request body: ${JSON.stringify(body)}`);

      const parsed = this.FeedbackSchema.safeParse(body);

      if (!parsed.success) {
        const formatted = parsed.error.issues;
        this.logger.warn("Validation failed", formatted);

        return this.createResponse(400, {
          message: "Validation failed",
          errors: formatted,
        });
      }
      //Data is validated using Zod validation

      const validatedData = parsed.data;

      const result = await this.feedbackService.createFeedback(
        validatedData,
        userId
      );

      if (result.error) {
        return this.createResponse(result.statusCode || 400, {
          message: result.message,
        });
      }

      return this.createResponse(201, {
        message: "Feedback submitted successfully.",
        data: result,
      });
    } catch (error) {
      this.logger.error("Error in createFeedback controller", error);
      return this.createResponse(500, { message: "Internal server error" });
    }
  }
}
