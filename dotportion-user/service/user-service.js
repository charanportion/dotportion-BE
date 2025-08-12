export class UserService {
  constructor(dbHandler, logger, userModel) {
    this.logger = logger;
    this.dbHandler = dbHandler;
    this.userModel = userModel;
    this.logger.info("--> UserService initialized");
  }

  async findUserByCognitoSub(cognitoSub) {
    try {
      if (!cognitoSub) {
        this.logger.warn("findUserByCognitoSub called without a cognitoSub.");
        return null;
      }
      // Connect to the database
      await this.dbHandler.connectDb();

      // Find the user and exclude the cognitoSub for security
      const user = await this.userModel
        .findOne({ cognitoSub })
        .select("-cognitoSub");
      return user;
    } catch (error) {
      this.logger.error("Error getting user:", error);
      return { error: true, message: "Error getting user" };
    }
  }
}
