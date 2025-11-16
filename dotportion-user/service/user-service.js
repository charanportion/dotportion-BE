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

  async updateUserProfile(userId, full_name, profile = {}) {
    try {
      if (!userId) {
        this.logger.warn("findUserById called without a userId.");
        return { error: true, message: "UserId Required" };
      }
      await this.dbHandler.connectDb();

      const update = {};
      if (profile && Object.keys(profile).length > 0) {
        for (const [key, value] of Object.entries(profile)) {
          update[`profile.${key}`] = value;
        }
      }
      if (full_name) update.full_name = full_name;

      const updatedUser = await this.userModel
        .findByIdAndUpdate(userId, { $set: update }, { new: true })
        .select("-cognitoSub -password");

      if (!updatedUser) {
        this.logger.info(`User not found with id: ${userId}`);
        return { error: true, message: "User not found" };
      }

      return updatedUser;
    } catch (error) {
      this.logger.error("Error updating user profile:", error);
      return { error: true, message: "Failed to update user profile" };
    }
  }

  async changePassword(userId, newPassword) {
    try {
      this.logger.info("changePassword service invoked");
      if (!userId) {
        this.logger.warn("findUserById called without a userId.");
        return { error: true, message: "UserId Required" };
      }
      await this.dbHandler.connectDb();

      const user = await this.userModel.findById(userId);

      if (!user) return { error: true, message: "User not found" };

      if (!newPassword || newPassword.length < 0) {
        return {
          error: true,
          message: "New password must be atleast 8 characters long",
        };
      }

      const passwordHash = await this.hashPassword(newPassword);
      user.password = passwordHash;

      await user.save();

      return { error: false, message: "Password updated successfully" };
    } catch (error) {
      this.logger.error("Error changing password", error);
      return { error: true, message: "Internal server error" };
    }
  }

  async updateTheme(userId, theme) {
    try {
      this.logger.info("UpdateTheme service invoked");

      if (!userId) {
        this.logger.warn("findUserById called without a userId.");
        return { error: true, message: "UserId Required" };
      }

      await this.dbHandler.connectDb();
      const allowed = ["light", "dark", "system"];
      if (!allowed.includes(theme)) {
        return { status: 40, message: "Invalid theme selected" };
      }

      const user = await this.userModel
        .findByIdAndUpdate(
          userId,
          { $set: { "profile.theme": theme } },
          { new: true }
        )
        .select("-cognitoSub -password");

      if (!user) {
        return { error: true, message: "User not found" };
      }

      return { error: false, message: "Theme updated successfully", user };
    } catch (error) {
      this.logger.error("Error updating theme", error);
      return { error: true, message: "Internal server error" };
    }
  }
}
