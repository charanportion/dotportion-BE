// import { createLog } from "../../layers/common/nodejs/utils/activityLogger.js";
import { createLog } from "../opt/nodejs/utils/activityLogger.js";
export class UserController {
  constructor(userService, logger, createResponse) {
    this.userService = userService;
    this.logger = logger;
    this.createResponse = createResponse;
    this.logger.info(`-->User Controller initialized`);
  }

  async getCurrentUser(event) {
    try {
      this.logger.info(
        "--> getCurrentUser controller invoked with event:",
        event
      );

      // const cognitoSub = event.requestContext.authorizer.claims.sub;
      const userId = event.requestContext.authorizer.userId;
      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      const user = await this.userService.findUserById(userId);

      if (user.error) {
        this.logger.warn(`User profile not found in DB for userId: ${userId}`);
        return this.createResponse(404, { message: user.message });
      }

      return this.createResponse(200, user);
    } catch (error) {
      this.logger.error("Error in getCurrentUser handler:", error);
      return this.createResponse(500, { message: "Internal server error." });
    }
  }

  async updateUserProfile(event) {
    const userId = event.requestContext.authorizer.userId;
    const body =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body || {};
    try {
      this.logger.info("--> updateUserProfile controller invoked");

      // const cognitoSub = event.requestContext.authorizer.claims.sub;

      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        createLog({
          userId: userId || null,
          action: "update user profile",
          type: "warn",
          metadata: {
            request: body,
            response: {
              status: 403,
              message: "Forbidden: User identifier not found.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      if (!body || Object.keys(body).length === 0) {
        createLog({
          userId: userId || null,
          action: "update user profile",
          type: "warn",
          metadata: {
            request: "Body not defined",
            response: {
              status: 400,
              message: "Profile data is required.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, {
          message: "Profile data is required.",
        });
      }

      const { full_name, profile } = body;

      const updatedUser = await this.userService.updateUserProfile(
        userId,
        full_name,
        profile
      );

      if (updatedUser.error) {
        createLog({
          userId: userId || null,
          action: "update user profile",
          type: "error",
          metadata: {
            request: body,
            response: { status: 404, error: updatedUser.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(404, {
          message: updatedUser.message,
        });
      }

      createLog({
        userId: userId || null,
        action: "update user profile",
        type: "info",
        metadata: {
          request: body,
          response: {
            status: 200,
            message: "Userprofile updated successfully",
            user: updatedUser,
          },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });

      return this.createResponse(200, {
        message: "User profile updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      this.logger.error("Error in updateUserProfile:", error);
      createLog({
        userId: userId || null,
        action: "update user profile",
        type: "error",
        metadata: {
          request: body,
          response: { error: error.message },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
      return this.createResponse(500, { message: "Internal server error." });
    }
  }

  async changePassword(event) {
    const userId = event.requestContext.authorizer.userId;

    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;

    try {
      this.logger.info("--> changePassword controller initialised");

      // const cognitoSub = event.requestContext.authorizer.claims.sub;
      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        createLog({
          userId: userId || null,
          action: "change password",
          type: "warn",
          metadata: {
            request: body,
            response: {
              status: 403,
              message: "Forbidden: User identifier not found.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        createLog({
          userId: userId || null,
          action: "change password",
          type: "warn",
          metadata: {
            request: "Body is not defined",
            response: {
              status: 400,
              message: "Request body is missing.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(400, { error: "Request body is missing." });
      }

      const { newPassword } = body;

      const result = await this.userService.changePassword(userId, newPassword);

      if (result.error) {
        createLog({
          userId: userId || null,
          action: "change password",
          type: "error",
          metadata: {
            request: body,
            response: { status: 404, error: error.message },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(404, {
          message: result.message,
        });
      }

      createLog({
        userId: userId || null,
        action: "change password",
        type: "info",
        metadata: {
          request: body,
          response: { status: 200, message: result.message },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });

      return this.createResponse(201, { message: result.message });
    } catch (error) {
      this.logger.error(
        "--> changePassword controller failed",
        JSON.stringify(error.message)
      );
      createLog({
        userId: userId || null,
        action: "change password",
        type: "error",
        metadata: {
          request: body,
          response: { error: error.message },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
      return this.createResponse(500, { message: "Internal server error" });
    }
  }

  async updateTheme(event) {
    try {
      this.logger.info("--> updateTheme controller initialised");

      // const cognitoSub = event.requestContext.authorizer.claims.sub;
      const userId = event.requestContext.authorizer.userId;
      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      const body =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;

      const { theme } = body;

      const result = await this.userService.updateTheme(userId, theme);

      if (result.error) {
        return this.createResponse(404, {
          message: result.message,
        });
      }

      return this.createResponse(201, {
        message: "Theme updated successfully",
        user: result.user,
      });
    } catch (error) {
      this.logger.error("--> updateTheme controller failed", error);

      return this.createResponse(500, { message: "Internal server error" });
    }
  }

  async getTours(event) {
    try {
      this.logger.info("--> getTours controller invoked");
      const userId = event.requestContext.authorizer.userId;
      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }
      const result = await this.userService.findToursByUserId(userId);
      if (result.error) {
        return this.createResponse(404, { message: result.message });
      }
      return this.createResponse(200, {
        tours: result.tours,
        isNewUser: result.isNewUser,
      });
    } catch (error) {
      this.logger.error("Error in getTours handler:", error);
      return this.createResponse(500, { message: "Internal server error." });
    }
  }

  async updateTour(event) {
    try {
      this.logger.info("--> updateTour controller invoked");
      const userId = event.requestContext.authorizer.userId;
      if (!userId) {
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }
      const body =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;
      if (!body || !body.tourKey) {
        this.logger.error("Validation failed: Missing request body.");
        return this.createResponse(400, {
          message: "tourKey is required in the request body",
        });
      }
      const { tourKey, completed = true } = body;
      const result = await this.userService.updateUserTour(
        userId,
        tourKey,
        completed
      );
      if (result.error) {
        return this.createResponse(400, { message: result.message });
      }
      // optional: set isNewUser false if you want to mark onboarding done when certain tours done
      return this.createResponse(200, {
        message: "Tour updated",
        tours: result.tours,
      });
    } catch (error) {
      this.logger.error("Error in updateTour handler:", error);
      return this.createResponse(500, { message: "Internal server error." });
    }
  }
}
