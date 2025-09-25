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

  async updateUserProfile(cognitoSub, profileData) {
    try {
      await this.dbHandler.connectDb();

      const update = {};
      for (const [key, value] of Object.entries(profileData)) {
        update[`profile.${key}`] = value;
      }

      const updatedUser = await this.userModel
        .findOneAndUpdate({ cognitoSub }, { $set: update }, { new: true })
        .select("-cognitoSub");

      return updatedUser;
    } catch (error) {
      this.logger.error("Error updating user profile:", error);
      throw new Error("Failed to update user profile");
    }
  }
}
