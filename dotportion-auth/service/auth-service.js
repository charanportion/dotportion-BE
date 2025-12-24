import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { syncUserAccessWithWaitlist } from "../utils/syncAccess.js";

export class AuthService {
  constructor(
    dbHandler,
    logger,
    otpModel,
    userModel,
    emailService,
    waitlistModel,
    JWT_SECRET
  ) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.otpModel = otpModel;
    this.userModel = userModel;
    this.waitlistModel = waitlistModel;
    this.emailService = emailService;
    this.JWT_SECRET = JWT_SECRET;
    this.logger.info("--> AuthService initialized");
  }

  generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  async signUp(email, password, full_name, name) {
    try {
      this.logger.info("--> signUp service invoked");
      await this.dbHandler.connectDb();
      const emailExists = await this.userModel.findOne({ email });
      if (emailExists) {
        return { status: 400, message: "Email already exists" };
      }

      const nameExists = await this.userModel.findOne({ name });
      if (nameExists) {
        return { status: 400, message: "Username already exists" };
      }

      const existingWaitlist = await this.waitlistModel.findOne({ email });

      if (existingWaitlist && existingWaitlist.invited) {
        existingWaitlist.inviteUsed = true;
        await existingWaitlist.save();
      }

      const passwordHash = await this.hashPassword(password);
      const otp = this.generateOtp();
      const user = await this.userModel.create({
        // cognitoSub: uuidv4(),
        email,
        name,
        full_name,
        password: passwordHash,
        authProvider: "email",
        isNewUser: true,
        isVerified: false,
      });

      if (existingWaitlist) {
        syncUserAccessWithWaitlist(user, existingWaitlist);
        await user.save();
      }

      const userObj = user.toObject();
      delete userObj.password;

      await this.otpModel.updateMany(
        { email, context: "REGISTER", used: false },
        { used: true }
      );

      const otpModel = await this.otpModel.create({
        user: user._id,
        email,
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        context: "REGISTER",
        used: false,
      });

      await this.emailService.sendOtpEmail(email, otp);

      return {
        status: 201,
        message: "User created successfully. Verify OTP to activate account.",
        user: userObj,
      };
    } catch (error) {
      this.logger.error("Error signing up:", error);
      return { status: 500, message: "Internal server error" };
    }
  }

  async verifyOtp(email, otp, context) {
    try {
      this.logger.info("--> verifyOtp service invoked");
      await this.dbHandler.connectDb();
      const user = await this.userModel.findOne({ email });
      const userOtp = await this.otpModel.findOne({
        email,
        context,
        used: false,
      });
      if (!user) return { status: 400, message: "User not found" };
      if (!userOtp)
        return { status: 400, message: "No active OTP found for this user" };

      if (userOtp.expiresAt < new Date())
        return { status: 400, message: "OTP has expired" };

      if (userOtp.otp !== otp)
        return { status: 400, message: "Invalid OTP entered" };

      userOtp.used = true;
      await userOtp.save();

      if (context === "REGISTER") {
        user.isVerified = true;
        await user.save();
      }

      const userObj = user.toObject();
      delete userObj.password;

      const payload = {
        userId: user._id,
        email: user.email,
        name: user.name,
      };
      if (context === "FORGOT_PASSWORD") {
        return {
          status: 200,
          message: "OTP verified successfully",
          // token,
          user: userObj,
        };
      }
      const token = jwt.sign(payload, this.JWT_SECRET, {
        expiresIn: "6h",
      });
      return {
        status: 200,
        message: "OTP verified successfully",
        token,
        user: userObj,
      };
    } catch (error) {
      this.logger.error(
        "OTP verification failed:",
        error.message,
        error.code,
        error.stack
      );
      return { status: 500, message: "Internal server error" };
    }
  }

  async resendOtp(email, context = "REGISTER") {
    try {
      this.logger.info("--> resendOtp service invoked");
      await this.dbHandler.connectDb();
      const user = await this.userModel.findOne({ email });
      if (!user) return { status: 400, message: "User not found" };

      const otp = this.generateOtp();

      await this.otpModel.updateMany(
        { email, context, used: false },
        { used: true }
      );
      await this.otpModel.create({
        user: user._id,
        email,
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        context,
        used: false,
      });

      await this.emailService.sendOtpEmail(email, otp);

      return {
        status: 200,
        message: "OTP resent succesfully",
        userId: user._id,
      };
    } catch (error) {
      this.logger.error("--> OTP resending failed", error);
      return { status: 500, message: "Internal server error" };
    }
  }

  async login(email, password) {
    try {
      this.logger.info("--> login service invoked");
      await this.dbHandler.connectDb();

      const user = await this.userModel.findOne({ email });
      if (!user) return { status: 400, message: "User not found" };
      if (!user.isVerified)
        return { status: 403, message: "User not verified" };

      const valid = await this.verifyPassword(password, user.password);
      if (!valid) return { status: 401, messsage: "Invalid credentials" };

      const payload = {
        userId: user._id,
        email: user.email,
        name: user.name,
      };

      const token = jwt.sign(payload, this.JWT_SECRET, {
        expiresIn: "6h",
      });

      return {
        status: 200,
        message: "Login successful",
        token,
        user,
      };
    } catch (error) {
      this.logger.error("--> Login failed", error);
      return { status: 500, message: "Internal server error" };
    }
  }
  async forgotPassword(email) {
    try {
      await this.dbHandler.connectDb();

      const user = await this.userModel.findOne({ email });
      if (!user) return { status: 404, message: "User not found" };

      const otp = this.generateOtp();

      await this.otpModel.updateMany(
        { email, context: "FORGOT_PASSWORD", used: false },
        { used: true }
      );

      await this.otpModel.create({
        user: user._id,
        email,
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        context: "FORGOT_PASSWORD",
        used: false,
      });

      await this.emailService.sendOtpEmail(email, otp);
      return {
        status: 200,
        message: "Password reset OTP sent successfully",
        user: { id: user._id },
      };
    } catch (error) {
      this.logger.error("--> Forgot password service failed");
      return { status: 500, message: " Internal server error" };
    }
  }

  async resetPassword(email, newPassword) {
    try {
      await this.dbHandler.connectDb();

      const user = await this.userModel.findOne({ email });
      if (!user) return { status: 404, message: "User not found" };

      const userOtp = await this.otpModel.findOne({
        email,
        context: "FORGOT_PASSWORD",
        used: true,
      });

      if (!userOtp) return { status: 400, message: "Not verified" };
      // if (userOtp.expiresAt < new Date())
      //   return { status: 400, message: "OTP expired" };
      // if (userOtp.otp !== otp)
      //   return { status: 400, message: "Invalid OTP entered" };

      user.password = await this.hashPassword(newPassword);
      await user.save();

      return {
        status: 200,
        message: "Password reset successfully",
        user: { id: user._id },
      };
    } catch (error) {
      this.logger.error("--> Reset password service failed");
      return { status: 500, message: " Internal server error" };
    }
  }

  async logout(token) {
    try {
      // For JWT → just delete/blacklist token; for sessions → destroy session

      // Add the token to a blacklist (optional, if you want server-side invalidation)
      // await this.blacklistModel.create({
      //   token,
      //   expiresAt: Date.now() + 3600 * 1000,
      // });

      return { status: 200, message: "User logged out successfully" };
    } catch (error) {
      this.logger.error("--> Logout service failed", error);
      return { status: 500, message: " Internal server error" };
    }
  }
}
