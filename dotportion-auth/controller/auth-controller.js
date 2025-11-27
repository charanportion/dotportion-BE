// import { JsonWebTokenError } from "jsonwebtoken";
export class AuthController {
  constructor(authService, logger, createResponse) {
    this.authService = authService;
    this.logger = logger;
    this.createResponse = createResponse;
  }

  async signup(event) {
    try {
      this.logger.info("--> Sign up Controller initialised");
      const body =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;

      const { email, password, name, full_name } = body;
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        this.logger.error("Validation failed: Invalid email format provided.");
        return this.createResponse(400, { error: "Valid email required" });
      }
      if (!password || password.length < 8) {
        this.logger.error(
          "Validation failed: Invalid password format provided."
        );
        return this.createResponse(400, {
          error: "Password must be at least 8 characters",
        });
      }
      if (!name || typeof name !== "string") {
        return this.createResponse(400, { error: "Name is required." });
      }
      if (!full_name || typeof full_name !== "string") {
        return this.createResponse(400, { error: "Name is required." });
      }
      const result = await this.authService.signUp(
        email,
        password,
        full_name,
        name
      );
      console.log(result);
      return this.createResponse(result.status, {
        message: result,
        token: result.token,
      });
    } catch (error) {
      this.logger.error("--> Signup controller failed", error);
      return { status: 500, message: "Internal server error" };
    }
  }

  async verifyOtp(event) {
    try {
      this.logger.info("--> verifyOtp controller initialised");
      const body =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;
      const { email, otp, context } = body;
      const result = await this.authService.verifyOtp(email, otp, context);
      return this.createResponse(result.status, { message: result.message });
    } catch (error) {
      this.logger.error("--> verifyOtp controller failed", error);
      return { status: 500, message: " Internal server error" };
      // return { status: 500, message: " Internal server error" };
    }
  }

  async resendOtp(event) {
    try {
      this.logger.info("--> resendOtp controller initialised");
      const body =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;
      const { email, context } = body;
      const result = await this.authService.resendOtp(email, context);
      return this.createResponse(result.status, { message: result.message });
    } catch (error) {
      this.logger.error("--> resendOtp controller failed", error);
      return { status: 500, message: " Internal server error" };
    }
  }
  async login(event) {
    try {
      this.logger.info("--> login controller initialised");
      const body =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;

      const { email, password } = body;
      const result = await this.authService.login(email, password);
      return this.createResponse(result.status, {
        message: result.message,
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      this.logger.error("--> login controller failed", error);
      return { status: 500, message: " Internal server error" };
    }
  }
  async forgotPassword(event) {
    try {
      this.logger.info("--> forgotPassword controller initialised");
      const body =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;
      const { email } = body;
      const result = await this.authService.forgotPassword(email);
      return this.createResponse(result.status, { message: result.message });
    } catch (error) {
      this.logger.error("--> forgotPassword controller failed", error);
      return { status: 500, message: " Internal server error" };
    }
  }
  async resetPassword(event) {
    try {
      this.logger.info("--> resetPassword controller initialised");
      const body =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;
      const { email, otp, new_password } = body;
      const result = await this.authService.resetPassword(
        email,
        otp,
        new_password
      );
      return this.createResponse(result.status, { message: result.message });
    } catch (error) {
      this.logger.error("--> resetPassword controller failed", error);
      return { status: 500, message: " Internal server error" };
    }
  }
  async logout(event) {
    try {
      this.logger.info("--> logout controller initialised");
      const body =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;
      const result = await this.authService.logout(body);
      return this.createResponse(result.status, { message: result.message });
    } catch (error) {
      this.logger.error("--> logout controller failed", error);
      return { status: 500, message: " Internal server error" };
    }
  }
}
