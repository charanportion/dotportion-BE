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
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Welcome!</title>
    <style>
        /* Basic Reset */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }

        /* General Styles */
        body {
            background-color: #f4f4f4; /* A light grey background to make the white email stand out */
            font-family: Arial, sans-serif;
        }
    </style>
</head>
<body style="margin: 0 !important; padding: 0 !important; background-color: #f4f4f4;">

    <!-- Main Table -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" style="background-color: #f4f4f4;">
                <!--[if (gte mso 9)|(IE)]>
                <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
                <tr>
                <td align="center" valign="top" width="600">
                <![endif]-->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                    <!-- Logo Section -->
                    <tr>
                        <td align="center" valign="top" style="padding: 40px 10px 40px 10px;">
                            <h2 style="font-size: 36px; font-weight: bold; margin: 0; color: #2c3e50; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0,0,0,0.1);">Dotportion</h2>
                        </td>
                    </tr>
                </table>
                <!--[if (gte mso 9)|(IE)]>
                </td>
                </tr>
                </table>
                <![endif]-->
            </td>
        </tr>
        <tr>
            <td align="center" style="padding: 0 10px 0 10px; background-color: #f4f4f4;">
                 <!--[if (gte mso 9)|(IE)]>
                <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
                <tr>
                <td align="center" valign="top" width="600">
                <![endif]-->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff;">
                    <!-- Main Content Section -->
                    <tr>
                        <td align="center" style="padding: 40px 30px 40px 30px; color: #000000; font-family: Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;">
                            <h1 style="font-size: 32px; font-weight: bold; margin: 0; color: #000000;">Thanks for joining us!</h1>
                            <p style="margin: 20px 0 0;">We are absolutely thrilled to have you on board.</p>
                        </td>
                    </tr>
                    <!-- Content Divider -->
                    <tr>
                        <td align="center" style="padding: 0 30px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="border-bottom: 1px solid #cccccc;"></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Secondary Content Section -->
                    <tr>
                        <td align="left" style="padding: 40px 30px 40px 30px; color: #333333; font-family: Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 25px;">
                            <p style="margin: 0;">As part of our inner circle, you're now on the priority list. This means you'll get exclusive early access to our product updates, special releases, and other offers before anyone else.</p>
                            <br>
                            <p style="margin: 0;">We're putting the final touches on our next big release and can't wait to share it with you. Please be patient, as we'll be in touch with an update very soon.</p>
                            <br>
                            <p style="margin: 0;">Welcome to the community!</p>
                        </td>
                    </tr>
                </table>
                <!--[if (gte mso 9)|(IE)]>
                </td>
                </tr>
                </table>
                <![endif]-->
            </td>
        </tr>
        <!-- Footer -->
        <tr>
            <td align="center" style="padding: 20px 10px 40px 10px; background-color: #f4f4f4;">
                <!--[if (gte mso 9)|(IE)]>
                <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
                <tr>
                <td align="center" valign="top" width="600">
                <![endif]-->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                    <tr>
                        <td align="center" style="padding: 0 30px 10px 30px; color: #808080; font-family: Arial, sans-serif; font-size: 12px; font-weight: 400; line-height: 18px;">
                            <p style="margin: 0;">Need help or have questions? Just reply to this email — we’d love to hear from you.</p>
                        </td>
                    </tr>
                </table>
                <!--[if (gte mso 9)|(IE)]>
                </td>
                </tr>
                </table>
                <![endif]-->
            </td>
        </tr>
    </table>

</body>
</html>
`;

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
