export class AccessService {
  constructor(dbHandler, logger, userModel, waitListModel) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.userModel = userModel;
    this.waitListModel = waitListModel;
    this.logger.info("--> AccessService initialized");
  }

  async requestAccess(userId) {
    try {
      this.logger.info("--> requestAccess service invoked");
      await this.dbHandler.connectDb();

      const user = await this.userModel.findById(userId);
      if (!user) {
        this.logger.info(`User not found with id: ${userId}`);
        return { status: 404, message: "User not found" };
      }

      let waitlist = await this.waitListModel.findOne({ email: user.email });

      if (user.access?.status === "requested") {
        return {
          status: 200,
          message: "Access already requested",
          access: user.access,
          waitlist,
        };
      }

      if (!waitlist) {
        waitlist = await this.waitListModel.create({
          email: user.email,
          status: "requested",
          type: "waitlist",
        });

        user.access = {
          status: "requested",
          source: "waitlist",
          requestedAt: new Date(),
          approvedAt: null,
          rejectedAt: null,
          approvedBy: null,
        };

        await user.save();

        return {
          status: 200,
          message: "Access request submitted",
          access: user.access,
          waitlist,
        };
      }

      if (waitlist.status === "approved") {
        user.access = {
          status: "approved",
          source: "waitlist",
          requestedAt: waitlist.createdAt,
          approvedAt: new Date(),
          rejectedAt: null,
          approvedBy: null,
        };

        await user.save();

        return {
          status: 200,
          message: "Access approved",
          access: user.access,
          waitlist,
        };
      }

      if (waitlist.status === "rejected") {
        user.access = {
          status: "rejected",
          source: "waitlist",
          requestedAt: waitlist.createdAt,
          approvedAt: null,
          rejectedAt: new Date(),
          approvedBy: null,
        };

        await user.save();

        return {
          status: 200,
          message: "Access rejected",
          access: user.access,
          waitlist,
        };
      }

      user.access = {
        status: "requested",
        source: "waitlist",
        requestedAt: waitlist.createdAt,
        approvedAt: null,
        rejectedAt: null,
        approvedBy: null,
      };

      await user.save();

      return {
        status: 200,
        message: "Access request submitted",
        access: user.access,
        waitlist,
      };
    } catch (err) {
      this.logger.error("Error in requestAccess:", err);
      console.log(err.message);
      return { status: 500, message: "Internal server error" };
    }
  }
}
