import UserActivityLog from "../models/UserActivityLog.js";
import { sanitizeData } from "./sanitizer.js";
import logger from "./logger.js";

const safeSerialize = (data) => {
  try {
    // First: convert Mongoose documents to plain objects if possible
    let candidate = data;
    try {
      if (candidate && typeof candidate.toObject === "function") {
        candidate = candidate.toObject({
          depopulate: true,
          getters: false,
          virtuals: false,
        });
      }
    } catch {
      // ignore
    }

    // Then sanitize deeply and return
    return sanitizeData(candidate);
  } catch (err) {
    logger.error(`safeSerialize failed: ${err?.message || String(err)}`);
    return { notice: "serialization_failed" };
  }
};

/**
 * createLog: non-blocking, safe, resilient logger for DB
 *
 * Usage:
 * createLog({ userId, action, type, metadata: { request, response, ... }})
 */
export const createLog = async ({
  userId = null,
  action,
  type = "info",
  metadata = {},
}) => {
  try {
    const {
      request = null,
      response = null,
      ...otherMetadata
    } = metadata || {};

    const sanitizedRequest = safeSerialize(request);
    const sanitizedResponse = safeSerialize(response);

    // Build final metadata (small and safe)
    const dbMetadata = {
      ...otherMetadata,
      request: sanitizedRequest,
      response: sanitizedResponse,
    };

    // Non-blocking create. Still attach a .catch to log DB errors (so we don't throw)
    UserActivityLog.create({
      userId,
      action,
      type,
      metadata: dbMetadata,
      createdAt: new Date(),
    }).catch((err) => {
      logger.error(`DB Activity Log Error: ${err?.message || String(err)}`);
    });
  } catch (err) {
    // Should never throw, but log if it does
    logger.error(`Activity Logger Failed: ${err?.message || String(err)}`);
  }
};
