export class WaitlistController {
  constructor(waitlistService, logger, createResponse, emailService) {
    this.waitlistService = waitlistService;
    this.logger = logger;
    this.createResponse = createResponse;
    this.emailService = emailService;
    this.logger.info(`-->Waitlist Controller initialized`);
  }

  async AddWaitlist(event) {
    this.logger.info("--> AddWaitlist controller invoked with event:", event);
    const { body } = event;
    try {
      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        return this.createResponse(400, { error: "Request body is missing." });
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
      const result = await this.waitlistService.addWaitlist(email);

      if (result.alreadySubscribed) {
        this.logger.info("User is already on the waitlist:", email);
        return this.createResponse(200, {
          message: "You are already on the waitlist.",
          data: { email: result.email },
        });
      }

      try {
        this.logger.info(
          "New user detected. Attempting to send confirmation email..."
        );
        const subject = "Thanks for Joining the Waitlist 🎉";
        const htmlContent = `<body style="font-family: Arial, sans-serif; background-color: #f1f1f1; padding: 20px;">
            <table width="100%" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
              <tr>
                <td style="padding: 20px; text-align: center;">
                  <h2 style="color: #333333;">🚀 You're on the Waitlist!</h2>
                  <p style="font-size: 16px; color: #555555;">Hi there,</p>
                  <p style="font-size: 16px; color: #555555;">Thanks for signing up for early access. We're thrilled to have you on board!</p>
                  <p style="font-size: 16px; color: #555555;">You’ll be among the first to know when we launch. We’ll keep you updated with exclusive news and early features.</p>
                  <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                  <p style="font-size: 13px; color: #999;">Need help or have questions? Just reply to this email — we’d love to hear from you.</p>
                </td>
              </tr>
            </table>
          </body>`;

        await this.emailService.sendWaitlistEmail(email, subject, htmlContent);
        this.logger.info("Email sending process initiated for:", email);
      } catch (emailError) {
        this.logger.error("--- CRITICAL: FAILED TO SEND EMAIL ---", emailError);
        // Don't fail the request if the email fails. Just log it.
      }

      this.logger.info("Returning success response for new user.");
      return this.createResponse(201, {
        message: "Successfully added to the waitlist!",
        data: result.data,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    } finally {
      this.logger.info("<--AddWaitlist controller completed");
    }
  }
}
