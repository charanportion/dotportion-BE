// import { createLog } from "../../layers/common/nodejs/utils/activityLogger.js";
import { createLog } from "../opt/nodejs/utils/activityLogger.js";

export class OAuthController {
  constructor(oauthService, logger, createResponse) {
    this.oauthService = oauthService;
    this.logger = logger;
    this.createResponse = createResponse;
  }

  async googleLogin(event) {
    try {
      createLog({
        action: "google-login-init",
        type: "info",
        metadata: {
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
      const url = this.oauthService.getGoogleAuthURL();
      return this.createResponse(302, null, {
        Location: url,
      });
    } catch (err) {
      this.logger.error("Google Login URL error", err);
      createLog({
        action: "google-login-error",
        type: "error",
        metadata: { error: err.message },
      });
      return this.createResponse(500, { error: "Internal Server Error" });
    }
  }

  async googleCallback(event) {
    try {
      const code = event.queryStringParameters?.code;

      const FRONTEND_URL = "http://localhost:3000";
      createLog({
        action: "google-callback-received",
        type: "info",
        metadata: {
          request: code,
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });

      const result = await this.oauthService.handleGoogleCallback(code);

      createLog({
        userId: result.user?._id,
        action: "google-callback-success",
        type: "info",
        metadata: {
          response: result.isNewUser,
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });

      return this.createResponse(302, null, {
        Location: `${FRONTEND_URL}/auth/success?token=${result.token}&new_user=${result.isNewUser}`,
      });
    } catch (err) {
      this.logger.error("Google OAuth callback error", err);
      createLog({
        action: "google-callback-error",
        type: "error",
        metadata: { err: err.message },
      });
      return this.createResponse(500, { error: "OAuth callback failed" });
    }
  }

  async githubLogin(event) {
    try {
      createLog({
        action: "github-login-init",
        type: "info",
        metadata: {
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
      return this.createResponse(302, null, {
        Location: this.oauthService.getGitHubAuthURL(),
      });
    } catch (err) {
      this.logger.error("GitHub Login error", err);
      createLog({
        action: "github-login-error",
        type: "error",
        metadata: { error: err.message },
      });
      return this.createResponse(500, { error: "Internal Server Error" });
    }
  }

  async githubCallback(event) {
    try {
      const code = event.queryStringParameters?.code;

      const FRONTEND_URL = "http://localhost:3000";
      createLog({
        action: "github-callback-received",
        type: "info",
        metadata: { request: code },
      });
      const result = await this.oauthService.handleGitHubCallback(code);

      createLog({
        userId: result.user?._id,
        action: "github-callback-success",
        type: "info",
        metadata: {
          response: result.isNewUser,
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });

      return this.createResponse(302, null, {
        Location: `${FRONTEND_URL}/auth/success?token=${result.token}&new_user=${result.isNewUser}`,
      });
    } catch (err) {
      this.logger.error("GitHub OAuth callback error", err);
      createLog({
        action: "github-callback-error",
        type: "error",
        metadata: { err: err.message },
      });
      return this.createResponse(500, { error: "OAuth callback failed" });
    }
  }

  async setUsername(event) {
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    try {
      this.logger.info("---Set username controller invoked---");

      const { username } = body;

      if (!username) {
        createLog({
          userId: null,
          action: "set-username",
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
        return this.createResponse(400, { error: "Username is required" });
      }

      // Get JWT token from Authorization header
      const auth = event.headers.Authorization || event.headers.authorization;
      if (!auth) {
        createLog({
          userId: null,
          action: "set-username",
          type: "warn",
          metadata: {
            request: body,
            response: {
              message: "JWT Token is required.",
            },
            ip: event?.requestContext?.identity?.sourceIp || "unknown",
            userAgent: event?.headers?.["User-Agent"] || "unknown",
          },
        });
        return this.createResponse(401, { error: "No token provided" });
      }

      const token = auth.replace("Bearer ", "");

      const decoded = jwt.verify(token, "my_secret_key_for_dotportion");

      const result = await this.oauthService.saveUsernameAndRefreshToken(
        decoded.userId,
        username
      );

      createLog({
        userId: result.user?._id || null,
        action: "set-username",
        type: "info",
        metadata: {
          request: body,
          response: {
            result,
          },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });

      return this.createResponse(200, {
        success: true,
        user: result.user,
        token: result.token, // return fresh token
      });
    } catch (err) {
      createLog({
        userId: null,
        action: "set-username",
        type: "error",
        metadata: {
          request: body,
          response: { error: err.message },
          ip: event?.requestContext?.identity?.sourceIp || "unknown",
          userAgent: event?.headers?.["User-Agent"] || "unknown",
        },
      });
      return this.createResponse(500, { error: "Failed to save username" });
    }
  }
}
