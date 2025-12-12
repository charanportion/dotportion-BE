// import { createLog } from "../../layers/common/nodejs/utils/activityLogger.js";
import { createLog } from "../opt/nodejs/utils/activityLogger.js";

export class AccessController {
  constructor(accessService, logger, createResponse) {
    this.accessService = accessService;
    this.logger = logger;
    this.createResponse = createResponse;
  }

  async requestAccess(event) {
    const userId = event.requestContext.authorizer.userId;
    try {
      this.logger.info("--> requestAccess controller initialized");

      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        createLog({
          userId: userId || null,
          action: "request access",
          type: "warn",
          metadata: {
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

      const result = await this.accessService.requestAccess(userId);

      createLog({
        userId: userId,
        action: "request-access",
        type: result.status === 200 ? "info" : "warn",
        metadata: {
          request: userId,
          response: result,
          ip: event.requestContext?.identity?.sourceIp,
          userAgent: event.headers?.["User-Agent"],
        },
      });

      return this.createResponse(result.status, {
        message: result.message,
        access: result.access,
        waitlist: result.waitlist,
      });
    } catch (error) {
      this.logger.error("--> requestAccess controller error", error);

      createLog({
        userId: userId || null,
        action: "request-access",
        type: "error",
        metadata: {
          request: body,
          response: { error: error.message },
        },
      });

      return this.createResponse(500, { message: "Internal server error" });
    }
  }
}
