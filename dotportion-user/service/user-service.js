import bcrypt from "bcryptjs";
export class UserService {
  constructor(dbHandler, logger, userModel) {
    this.logger = logger;
    this.dbHandler = dbHandler;
    this.userModel = userModel;
    this.logger.info("--> UserService initialized");
  }

  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
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

  async updateUserProfile(cognitoSub, full_name, profile = {}) {
    try {
      await this.dbHandler.connectDb();

      const update = {};
      if (profile && Object.keys(profile).length > 0) {
        for (const [key, value] of Object.entries(profile)) {
          update[`profile.${key}`] = value;
        }
      }
      if (full_name) update.full_name = full_name;

      console.log(update);

      const updatedUser = await this.userModel
        .findOneAndUpdate({ cognitoSub }, { $set: update }, { new: true })
        .select("-cognitoSub");

      return updatedUser;
    } catch (error) {
      this.logger.error("Error updating user profile:", error);
      throw new Error("Failed to update user profile");
    }
  }

  async changePassword(cognitoSub, newPassword) {
    try {
      this.logger.info("changePassword service invoked");
      await this.dbHandler.connectDb();

      const user = await this.userModel.findOne({ cognitoSub });

      if (!user) return { status: 404, message: "User not found" };
      console.log(user);

      console.log(user.password);

      if (!newPassword || newPassword.length < 0) {
        return {
          status: 400,
          message: "New password must be atleast 8 characters long",
        };
      }

      const passwordHash = await this.hashPassword(newPassword);
      user.password = passwordHash;

      await user.save();

      return { status: 200, message: "Password updated successfully" };
    } catch (error) {
      this.logger.error("Error changing password", error);
      return { status: 500, message: "Internal server error" };
    }
  }

  async updateTheme(cognitoSub, theme) {
    try {
      this.logger.info("UpdateTheme service invoked");

      await this.dbHandler.connectDb();
      const allowed = ["light", "dark", "system"];
      if (!allowed.includes(theme)) {
        return { status: 40, message: "Invalid theme selected" };
      }

      const user = await this.userModel
        .findOneAndUpdate({ cognitoSub }, { theme }, { new: true })
        .select("-cognitoSub");

      if (!user) {
        return { status: 404, message: "User not found" };
      }

      return { status: 200, message: "Theme updated successfully", user };
    } catch (error) {
      this.logger.error("Error updating theme", error);
      return { status: 500, message: "Internal server error" };
    }
  }
}
