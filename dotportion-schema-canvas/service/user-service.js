export class UserService {
  constructor(dbHandler, logger, userModel) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.userModel = userModel;
    this.logger.info(`-->User Service initialized`);
  }

  async getTenant(cognitoSub) {
    try {
      this.logger.info(
        `-->getTenant service invoked with cognitoSub: ${cognitoSub}`
      );
      if (!cognitoSub) {
        this.logger.warn("getTenant called without a cognitoSub.");
        return { error: true, message: "No cognitoSub" };
      }

      await this.dbHandler.connectDb();

      const user = await this.userModel.findOne({
        cognitoSub: cognitoSub,
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
