export class UserService {
  constructor(dbHandler, logger, UserModel) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.UserModel = UserModel;
    this.logger.info(`-->User Service initialized in Workflow Module`);
  }

  async findUserByCognitoSub(cognitoSub) {
    try {
      this.logger.info(
        `-->findUserByCognitoSub service invoked with cognitoSub:`,
        cognitoSub
      );
      if (!cognitoSub) {
        this.logger.warn("findUserByCognitoSub called without a cognitoSub.");
        return { error: true, message: "No Cognito Sub" };
      }
      await this.dbHandler.connectDb();
      const user = await this.UserModel.findOne({ cognitoSub });
      return user;
    } catch (error) {
      this.logger.error("Error in findUserByCognitoSub service:", error);
      return { error: true, message: "Error finding user" };
    }
  }
}
