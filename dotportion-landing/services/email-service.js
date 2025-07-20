export class EmailService {
  constructor(
    logger,
    nodemailer,
    host,
    port,
    auth_mail,
    auth_password,
    dbHandler
  ) {
    this.logger = logger;
    this.nodemailer = nodemailer;
    this.host = host;
    this.port = port;
    this.auth_mail = auth_mail;
    this.auth_password = auth_password;
    this.dbHandler = dbHandler;
    this.logger.info("--> EmailService initialized");
  }
  async sendNewsletter(email, subject, content) {
    try {
      await this.send(email, subject, content);
      return;
    } catch (err) {
      console.error("Error in sendNewsletter logic:", err);
      throw err;
    }
  }

  async sendWaitlistEmail(email, subject, content) {
    try {
      await this.send(email, subject, content);
      return;
    } catch (err) {
      console.error("Error in sendWaitlistEmail logic:", err);
      throw err;
    }
  }

  // THIS IS THE KEY CHANGE
  async send(to, subject, htmlContent) {
    try {
      const transporter = this.nodemailer.createTransport({
        host: this.host,
        port: parseInt(this.port),
        secure: true, // true for 465, false for other ports
        auth: {
          user: this.auth_mail,
          pass: this.auth_password,
        },
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000, // 10 seconds
        socketTimeout: 10000, // 10 seconds
      });

      // NEW: Add a verification step to get a clearer error on connection failure

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

      this.logger.info(`Email transport successful for ${to}`);
    } catch (err) {
      this.logger.error("Nodemailer transport or verification failed:", err);
      throw err;
    }
  }
}
