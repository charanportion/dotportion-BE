export class UserService {
  constructor(dbHandler, logger, UserModel) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.UserModel = UserModel;
    this.logger.info(`-->User Service initialized in Secret Module`);
  }

  async findUserById(userId) {
    try {
      if (!userId) {
        this.logger.warn("findUserById called without a userId.");
        return { error: true, message: "UserId Required" };
      }
      // Connect to the database
      await this.dbHandler.connectDb();

      // Find the user and exclude the cognitoSub for security
      const user = await this.userModel
        .findById(userId)
        .select("-cognitoSub -password");

      if (!user) {
        this.logger.info(`User not found with id: ${userId}`);
        return { error: true, message: "User not found" };
      }
      return user;
    } catch (error) {
      this.logger.error("Error getting user:", error);
      return { error: true, message: "Error getting user" };
    }
  }
}
