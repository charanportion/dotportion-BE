import fs from "fs";
import path from "path";

export class EmailService {
  constructor(logger, nodemailer, host, port, auth_mail, auth_password, url) {
    this.logger = logger;
    this.nodemailer = nodemailer;
    this.host = host;
    this.port = port;
    this.auth_mail = auth_mail;
    this.auth_password = auth_password;
    this.url = url;
    this.templatesDir = path.join(process.cwd(), "templates");
    this.logger.info("--> EmailService initialized");
  }

  async send(to, subject, htmlContent) {
    try {
      const transporter = this.nodemailer.createTransport({
        host: this.host,
        port: parseInt(this.port),
        secure: true, // true for 465
        auth: {
          user: this.auth_mail,
          pass: this.auth_password,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
      console.log(transporter);

      this.logger.info(`Verifying SMTP transporter connection...`);
      await transporter.verify();
      this.logger.info(`SMTP transporter verified successfully.`);

      this.logger.info(`Attempting to send mail to ${to}`);
      await transporter.sendMail({
        from: `DotPortion <${this.auth_mail}>`,
        to,
        subject,
        html: htmlContent,
      });

      this.logger.info(`Email sent successfully to ${to}`);
    } catch (err) {
      this.logger.error("Nodemailer transport failed:", err);
      throw err;
    }
  }

  loadTemplate(templateName, variables = {}) {
    const filePath = path.join(this.templatesDir, templateName);
    let html = fs.readFileSync(filePath, "utf-8");

    // Replace {{VARIABLES}}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      html = html.replace(regex, value);
    });

    return html;
  }

  async sendOtpEmail(to, otp) {
    const subject = "Your OTP Code - DotPortion";
    const htmlContent = this.loadTemplate("otp_sent.html", {
      OTP_CODE: otp,
      DISCORD_INVITE_URL: "https://discord.gg/vs2q5RMb",
      INSTAGRAM_URL: "https://www.instagram.com/dotportion/",
      YOUTUBE_URL: this.url + "/youtube",
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
      YOUTUBE_URL: this.url + "/youtube",
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
      YOUTUBE_URL: this.url + "/youtube",
      LINKEDIN_URL: "https://www.linkedin.com/company/dotportion/",
    });

    await this.send(to, subject, htmlContent);
  }
}
