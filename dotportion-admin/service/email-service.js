export class EmailService {
  constructor(logger, nodemailer, host, port, auth_mail, auth_password, url) {
    this.logger = logger;
    this.nodemailer = nodemailer;
    this.host = host;
    this.port = port;
    this.auth_mail = auth_mail;
    this.auth_password = auth_password;
    this.url = url;
    this.logger.info("--> EmailService initialized");
  }

  async send(to, subject, htmlContent) {
    try {
      const transporter = this.nodemailer.createTransport({
        host: this.host,
        port: parseInt(this.port),
        secure: true,
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
      console.log(err.message, err.stack);
      throw err;
    }
  }
}
