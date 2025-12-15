import { info } from "console";
// import { createLog } from "../../layers/common/nodejs/utils/activityLogger.js";
import { createLog } from "../opt/nodejs/utils/activityLogger.js";

export class OAuthController {
  constructor(oauthService, logger, createResponse, FRONTEND_URL) {
    this.oauthService = oauthService;
    this.logger = logger;
    this.createResponse = createResponse;
    this.FRONTEND_URL = FRONTEND_URL;
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
        Location: `${this.FRONTEND_URL}/auth/success?token=${result.token}&new_user=${result.isNewUser}&email=${result.user.email}`,
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
        Location: `${this.FRONTEND_URL}/auth/success?token=${result.token}&new_user=${result.isNewUser}&email=${result.user.email}`,
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
      this.logger.info("--- Set Username Controller Invoked ---");
      if (!body) {
        this.logger.error("Validation failed: Missing request body.");
        return this.createResponse(400, { error: "Request body is missing." });
      }
      const { email, username } = body;

      if (!email || !username) {
        return this.createResponse(400, {
          error: "Email and username are required",
        });
      }

      const result = await this.oauthService.saveUsernameAndRefreshTokenByEmail(
        email,
        username
      );

      if (!result || !result.user) {
        return this.createResponse(404, { error: "User not found" });
      }

      return this.createResponse(200, {
        success: true,
        user: result.user,
        token: result.token,
      });
    } catch (err) {
      this.logger.error("Set Username Error (EMAIL BASED)", err);
      return this.createResponse(500, { error: "Failed to save username" });
    }
  }
}
