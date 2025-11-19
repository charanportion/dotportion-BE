export class UserService {
  constructor(dbHandler, logger, userModel) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.userModel = userModel;
    this.logger.info(`-->User Service initialized`);
  }

  async getTenant(userId) {
    try {
      this.logger.info(`-->getTenant service invoked with userId: ${userId}`);
      if (!userId) {
        this.logger.warn("getTenant called without a userId.");
        return { error: true, message: "No userId" };
      }

      await this.dbHandler.connectDb();

      const user = await this.userModel.findOne({
        userId: userId,
      });

      if (!user) {
        return {
          error: true,
          message: "user not found",
        };
      }

      return user.name;
    } catch (error) {
      this.logger.error(`Error in getTenant service:${error}`);
      return { error: true, message: "Error in getTenant" };
    }
  }
}
