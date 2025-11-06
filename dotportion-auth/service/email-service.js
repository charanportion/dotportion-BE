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

  async sendOtpEmail(to, otp) {
    const subject = "Your OTP Code - DotPortion";
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 16px; background-color: #f9f9f9; border-radius: 8px;">
        <h2 style="color: #333;">Email Verification</h2>
        <p>Dear user,</p>
        <p>Your OTP code is:</p>
        <h1 style="background: #007bff; color: white; display: inline-block; padding: 10px 20px; border-radius: 6px;">${otp}</h1>
        <p>This OTP is valid for <strong>10 minutes</strong>. Please do not share it with anyone.</p>
        <p>Thank you for using DotPortion.</p>
      </div>
    `;

    await this.send(to, subject, htmlContent);
  }

  async sendPasswordResetEmail(to, resetPasswordToken) {
    const subject = "Password Reset Request - DotPortion";
    const resetLink = `https://${this.url}/reset-password?token=${resetPasswordToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 16px; background-color: #f9f9f9; border-radius: 8px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}" style="display:inline-block; padding:10px 20px; background:#007bff; color:white; text-decoration:none; border-radius:6px;">Reset Password</a>
        <p>This link is valid for 10 minutes.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `;

    await this.send(to, subject, htmlContent);
  }
}
