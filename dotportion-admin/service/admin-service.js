export class AdminService {
  constructor(dbHandler, waitListModel, emailService, logger) {
    this.dbHandler = dbHandler;
    this.waitListModel = waitListModel;
    this.emailService = emailService;
    this.logger = logger;
  }

  async inviteUser(email) {
    await this.dbHandler.connectDb();

    email = email.toLowerCase();

    let existing = await this.waitListModel.findOne({ email });

    if (existing && existing.invited) {
      return {
        alreadyInvited: true,
        message: "This email is already invited.",
      };
    }

    if (!existing) {
      existing = await this.waitListModel.create({
        email,
        status: "approved",
        type: "invite",
        invited: true,
        inviteUsed: false,
      });
    } else {
      existing.status = "approved";
      existing.type = "invite";
      existing.invited = true;
      existing.inviteUsed = false;
      await existing.save();
    }

    // Generate invite link
    const FRONTEND_URL = "http://localhost:3000";
    const inviteLink = `${FRONTEND_URL}/auth/signin`;

    const subject = "You are invited to DotPortion!";
    const html = `
      <div style="font-family: Arial; padding: 16px;">
        <h2>You are invited to DotPortion 🚀</h2>
        <p>You have been granted immediate access to the platform.</p>
        <p>Click below to create your account:</p>
        <a href="${inviteLink}"
           style="padding:12px 18px; background:#000; color:#fff; text-decoration:none; border-radius:6px;">
           Accept Invite
        </a>
        <p>This link is exclusive to you. Please do not share it.</p>
      </div>
    `;

    await this.emailService.send(email, subject, html);

    return {
      success: true,
      inviteLink,
      waitlist: existing,
    };
  }

  async markInviteUsed(email) {
    await this.dbHandler.connectDb();

    const waitlist = await this.waitListModel.findOne({ email });

    if (waitlist && waitlist.invited) {
      waitlist.inviteUsed = true;
      await waitlist.save();
    }
  }
}
