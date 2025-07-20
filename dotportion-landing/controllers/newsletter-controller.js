export class NewsletterController {
  constructor(
    newsletterService,
    logger,
    createResponse,
    emailService,
    createHtmlResponse,
    createUnsubscribeSuccessHtml,
    createUnsubscribeErrorHtml,
    createInvalidEmailHtml,
    emailTemplates
  ) {
    this.newsletterService = newsletterService;
    this.logger = logger;
    this.createResponse = createResponse;
    this.emailService = emailService;
    this.createHtmlResponse = createHtmlResponse;
    this.createUnsubscribeSuccessHtml = createUnsubscribeSuccessHtml;
    this.createUnsubscribeErrorHtml = createUnsubscribeErrorHtml;
    this.createInvalidEmailHtml = createInvalidEmailHtml;
    this.emailTemplates = emailTemplates;
    this.logger.info(`-->NewsLetter Controller initialized`);
  }

  async Subscribe(event) {
    this.logger.info("--> Subscribe controller invoked with event:", event);
    const { body } = event;
    try {
      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        return this.createResponse(400, {
          error: "Request body is missing.",
        });
      }
      this.logger.info(`Received request body: ${JSON.stringify(body)}`);

      const { email } = JSON.parse(body);

      this.logger.info(`Received email: ${email}`);

      if (!email || typeof email !== "string" || !/\S+@\S+\.\S+/.test(email)) {
        this.logger.error("Validation failed: Invalid email format provided.");
        return this.createResponse(400, {
          error: "A valid email is required.",
        });
      }
      this.logger.info(`Adding Waitlist...`);
      const result = await this.newsletterService.subscribe(email);

      if (result.alreadySubscribed) {
        this.logger.info("User is already on the newsletter:", email);
        return this.createResponse(200, {
          message: "You are already on the newsletter.",
          data: { email: result.email },
        });
      }

      try {
        this.logger.info(
          "New user detected. Attempting to send confirmation email..."
        );
        const subject = "Thanks for Subscribing to the Newsletter 🎉";
        const unsubscribeUrl = this.emailTemplates.createUnsubscribeUrl(
          process.env.BASE_URL,
          email
        );
        const htmlContent = this.emailTemplates.createWelcomeEmailTemplate(
          email,
          unsubscribeUrl
        );

        await this.emailService.sendNewsletter(email, subject, htmlContent);
        this.logger.info("Email sending process initiated for:", email);
      } catch (emailError) {
        this.logger.error("--- CRITICAL: FAILED TO SEND EMAIL ---", emailError);
        // Don't fail the request if the email fails. Just log it.
      }
      this.logger.info("Returning success response for new user.");
      return this.createResponse(201, {
        message: "Successfully added to the newsletter!",
        data: result,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    } finally {
      this.logger.info("<--AddWaitlist controller completed");
    }
  }
  async UnSubscribe(event) {
    this.logger.info("--> UnSubscribe controller invoked with event:", event);
    try {
      const { email } = event.queryStringParameters || {};

      this.logger.info(`Received email: ${email}`);

      if (!email || typeof email !== "string" || !/\S+@\S+\.\S+/.test(email)) {
        this.logger.error("Validation failed: Invalid email format provided.");

        return this.createHtmlResponse(400, this.createInvalidEmailHtml(email));
      }
      this.logger.info(`Unsubscribing Newsletter...`);
      const result = await this.newsletterService.unsubscribe(email);

      if (result.error) {
        this.logger.info(`${result.message}`, email);

        return this.createHtmlResponse(
          400,
          this.createUnsubscribeErrorHtml(email, result.message)
        );
      }

      this.logger.info("Returning HTML response for unsubscribe.");
      return this.createHtmlResponse(
        200,
        this.createUnsubscribeSuccessHtml(email)
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    } finally {
      this.logger.info("<--Unsubscribe controller completed");
    }
  }
}
