// import { createLog } from "../../layers/common/nodejs/utils/activityLogger.js";
import { createLog } from "../opt/nodejs/utils/activityLogger.js";

export class AuthController {
  constructor(authService, logger, createResponse) {
    this.authService = authService;
    this.logger = logger;
    this.createResponse = createResponse;
  }

  async signup(event) {
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    try {
      this.logger.info("--> Sign up Controller initialised");

      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        createLog({
          userId: null,
          action: "sign-up",
          type: "warn",
          metadata: {
            request: "Body not defined",
            response: {
              message: "Request body is missing.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, { error: "Request body is missing." });
      }
      this.logger.info(`Received request body: ${JSON.stringify(body)}`);

      const { email, password, name, full_name } = body;
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        this.logger.error("Validation failed: Invalid email format provided.");
        createLog({
          userId: null,
          action: "sign-up",
          type: "warn",
          metadata: {
            request: body,
            response: {
              message: "Valid email required",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, { error: "Valid email required" });
      }
      if (!password || password.length < 8) {
        this.logger.error(
          "Validation failed: Invalid password format provided."
        );
        createLog({
          userId: null,
          action: "sign-up",
          type: "warn",
          metadata: {
            request: body,
            response: {
              message: "Password must be at least 8 characters",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, {
          error: "Password must be at least 8 characters",
        });
      }
      if (!name || typeof name !== "string") {
        createLog({
          userId: null,
          action: "sign-up",
          type: "warn",
          metadata: {
            request: body,
            response: {
              message: "Name is required.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, { error: "Name is required." });
      }
      if (!full_name || typeof full_name !== "string") {
        createLog({
          userId: null,
          action: "sign-up",
          type: "warn",
          metadata: {
            request: body,
            response: {
              message: "Full Name is required.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, { error: "Full Name is required." });
      }
      const result = await this.authService.signUp(
        email,
        password,
        full_name,
        name
      );
      if (result.status === 400 || result.status === 404) {
        createLog({
          userId: result.user?.id || null,
          action: "sign-up",
          type: "warn",
          metadata: {
            request: body,
            response: { status: result.status, message: result.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
      } else {
        createLog({
          userId: result.user?.id || null,
          action: "sign-up",
          type: "info",
          metadata: {
            request: body,
            response: result,
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
      }

      return this.createResponse(result.status, {
        message: result,
      });
    } catch (error) {
      this.logger.error("--> Signup controller failed", error);
      createLog({
        userId: null,
        action: "sign-up",
        type: "error",
        metadata: {
          request: body,
          response: { error: error.message },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
      return { status: 500, message: "Internal server error" };
    }
  }

  async verifyOtp(event) {
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    try {
      this.logger.info("--> verifyOtp controller initialised");

      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        createLog({
          userId: null,
          action: "verify-otp",
          type: "warn",
          metadata: {
            request: "Body not defined",
            response: {
              message: "Request body is missing.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, { error: "Request body is missing." });
      }
      this.logger.info(`Received request body: ${JSON.stringify(body)}`);

      const { email, otp, context } = body;
      const result = await this.authService.verifyOtp(email, otp, context);
      if (result.status === 400 || result.status === 404) {
        createLog({
          userId: result.user?.id || null,
          action: "verify-otp",
          type: "warn",
          metadata: {
            request: body,
            response: { status: result.status, message: result.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
      } else {
        createLog({
          userId: result.user || null,
          action: "verify-otp",
          type: "info",
          metadata: {
            request: body,
            response: {
              status: result.status,
              message: result.message,
              token: result.token,
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
      }
      return this.createResponse(result.status, {
        message: result.message,
        token: result.token,
      });
    } catch (error) {
      this.logger.error("--> verifyOtp controller failed", error);
      createLog({
        userId: null,
        action: "verify-otp",
        type: "error",
        metadata: {
          request: body,
          response: { error: error.message },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
      return { status: 500, message: " Internal server error" };
      // return { status: 500, message: " Internal server error" };
    }
  }

  async resendOtp(event) {
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;

    try {
      this.logger.info("--> resendOtp controller initialised");

      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        createLog({
          userId: null,
          action: "resend-otp",
          type: "warn",
          metadata: {
            request: "Body not defined",
            response: {
              message: "Request body is missing.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, { error: "Request body is missing." });
      }
      this.logger.info(`Received request body: ${JSON.stringify(body)}`);

      const { email, context } = body;
      const result = await this.authService.resendOtp(email, context);
      if (result.status === 400 || result.status === 404) {
        createLog({
          userId: result.user?.id || null,
          action: "resend-otp",
          type: "warn",
          metadata: {
            request: body,
            response: { status: result.status, message: result.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
      } else {
        createLog({
          userId: result?.userId || null,
          action: "resend-otp",
          type: "info",
          metadata: {
            request: body,
            response: { status: result.status, message: result.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
      }
      return this.createResponse(result.status, { message: result.message });
    } catch (error) {
      this.logger.error("--> resendOtp controller failed", error);
      createLog({
        userId: null,
        action: "resend-otp",
        type: "error",
        metadata: {
          request: body,
          response: { error: error.message },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
      return { status: 500, message: " Internal server error" };
    }
  }
  async login(event) {
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    try {
      this.logger.info("--> login controller initialised");

      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        createLog({
          userId: null,
          action: "login",
          type: "warn",
          metadata: {
            request: "Body not defined",
            response: {
              message: "Request body is missing.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, { error: "Request body is missing." });
      }
      this.logger.info(`Received request body: ${JSON.stringify(body)}`);

      const { email, password } = body;
      const result = await this.authService.login(email, password);
      if (
        result.status === 400 ||
        result.status === 404 ||
        result.staus === 403
      ) {
        createLog({
          userId: result.user?.id || null,
          action: "login",
          type: "warn",
          metadata: {
            request: body,
            response: { status: result.status, message: result.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
      } else {
        createLog({
          userId: result.user?._id || null,
          action: "login",
          type: "info",
          metadata: {
            request: body,
            response: result,
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
      }
      return this.createResponse(result.status, {
        message: result.message,
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      this.logger.error("--> login controller failed", error);
      createLog({
        userId: null,
        action: "login",
        type: "error",
        metadata: {
          request: body,
          response: { error: error.message },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
      return { status: 500, message: " Internal server error" };
    }
  }
  async forgotPassword(event) {
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;

    try {
      this.logger.info("--> forgotPassword controller initialised");
      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        createLog({
          userId: null,
          action: "login",
          type: "warn",
          metadata: {
            request: "Body not defined",
            response: {
              message: "Request body is missing.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, { error: "Request body is missing." });
      }
      this.logger.info(`Received request body: ${JSON.stringify(body)}`);
      const { email } = body;
      const result = await this.authService.forgotPassword(email);
      if (result.status === 400 || result.status === 404) {
        createLog({
          userId: result.user?.id || null,
          action: "forgot-password",
          type: "warn",
          metadata: {
            request: body,
            response: { status: result.status, message: result.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
      } else {
        createLog({
          userId: result.user?.id || null,
          action: "forgot-password",
          type: "info",
          metadata: {
            request: body,
            response: { status: result.status, message: result.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
      }
      return this.createResponse(result.status, { message: result.message });
    } catch (error) {
      this.logger.error("--> forgotPassword controller failed", error);
      createLog({
        userId: null,
        action: "forgot-password",
        type: "error",
        metadata: {
          request: body,
          response: { error: error.message },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
      return { status: 500, message: " Internal server error" };
    }
  }
  async resetPassword(event) {
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    try {
      this.logger.info("--> resetPassword controller initialised");

      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        createLog({
          userId: null,
          action: "reset-password",
          type: "warn",
          metadata: {
            request: "Body not defined",
            response: {
              message: "Request body is missing.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, { error: "Request body is missing." });
      }
      this.logger.info(`Received request body: ${JSON.stringify(body)}`);

      const { email, otp, new_password } = body;
      const result = await this.authService.resetPassword(
        email,
        otp,
        new_password
      );

      if (result.status === 400 || result.status === 404) {
        createLog({
          userId: result.user?.id || null,
          action: "reset-password",
          type: "warn",
          metadata: {
            request: body,
            response: { status: result.status, message: result.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
      } else {
        createLog({
          userId: result.user?.id || null,
          action: "reset-password",
          type: "info",
          metadata: {
            request: body,
            response: { status: result.status, message: result.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
      }
      return this.createResponse(result.status, { message: result.message });
    } catch (error) {
      this.logger.error("--> resetPassword controller failed", error);
      createLog({
        userId: null,
        action: "reset-password",
        type: "error",
        metadata: {
          request: body,
          response: { error: error.message },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
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
