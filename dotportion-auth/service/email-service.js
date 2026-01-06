import fs from "fs";
import path from "path";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({
  region: process.env.AWS_REGION,
});

export class EmailService {
  constructor(logger, fromEmail, baseUrl) {
    this.logger = logger;
    this.fromEmail = fromEmail;
    this.baseUrl = baseUrl;
    this.templatesDir = path.join(process.cwd(), "templates");
    this.logger.info("--> EmailService initialized");
  }

  async send(to, subject, htmlContent) {
    try {
      const command = new SendEmailCommand({
        Source: `DotPortion <${this.fromEmail}>`,
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: htmlContent,
              Charset: "UTF-8",
            },
          },
        },
      });

      await ses.send(command);

      this.logger.info(
        `${JSON.stringify({
          level: "info",
          message: "SES email sent successfully",
          to,
          subject,
        })}`
      );
    } catch (err) {
      const sesError = {
        level: "error",
        service: "EmailService",
        action: "SES.sendEmail",
        message: err?.message || "Unknown SES error",
        name: err?.name,
        code: err?.code,
        fault: err?.fault,
        time: err?.time,
        requestId: err?.$metadata?.requestId,
        httpStatusCode: err?.$metadata?.httpStatusCode,
        region: process.env.AWS_REGION,
        fromEmail: this.fromEmail,
        to,
        subject,
        stack: err?.stack,
      };

      this.logger.error(`${JSON.stringify(sesError, null, 2)}`);

      throw err; // 🔴 rethrow for upstream handling
    }
  }

  loadTemplate(templateName, variables = {}) {
    const filePath = path.join(this.templatesDir, templateName);
    let html = fs.readFileSync(filePath, "utf-8");

    Object.entries(variables).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{{${key}}}`, "g"), value);
    });

    return html;
  }

  async sendOtpEmail(to, otp) {
    const subject = "Your OTP Code - DotPortion";
    const htmlContent = this.loadTemplate("otp_sent.html", {
      OTP_CODE: otp,
      DISCORD_INVITE_URL: "https://discord.gg/vs2q5RMb",
      INSTAGRAM_URL: "https://www.instagram.com/dotportion/",
      YOUTUBE_URL: this.baseUrl + "/youtube",
      LINKEDIN_URL: "https://www.linkedin.com/company/dotportion/",
    });

    await this.send(to, subject, htmlContent);
  }

  async sendWelcomeMail(to, name = "there") {
    const subject = "Welcome to DotPortion 🎉";

    const htmlContent = this.loadTemplate("welcome_user.html", {
      name,
      APP_URL: "https://beta.dotportion.com/auth/signin",
      DISCORD_INVITE_URL: "https://discord.gg/vs2q5RMb",
      INSTAGRAM_URL: "https://www.instagram.com/dotportion/",
      YOUTUBE_URL: this.baseUrl + "/youtube",
      LINKEDIN_URL: "https://www.linkedin.com/company/dotportion/",
    });

    await this.send(to, subject, htmlContent);
  }

  async sendAccessAcceptedEmail(to, name = "there") {
    const subject = "Your Access to DotPortion is Approved 🚀";

    const htmlContent = this.loadTemplate("access_accepted.html", {
      name,
      APP_URL: "https://beta.dotportion.com/auth/signin",
      DISCORD_INVITE_URL: "https://discord.gg/vs2q5RMb",
      INSTAGRAM_URL: "https://www.instagram.com/dotportion/",
      YOUTUBE_URL: this.baseUrl + "/youtube",
      LINKEDIN_URL: "https://www.linkedin.com/company/dotportion/",
    });

    await this.send(to, subject, htmlContent);
  }
}
