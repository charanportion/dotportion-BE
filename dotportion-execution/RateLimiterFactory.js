import rateLimit from "express-rate-limit";

export class RateLimiterFactory {
  // ⚠️ WARNING: In-memory cache is not suitable for production serverless environments.
  // Use a distributed cache like Redis instead. This is for demonstration.
  #limiters = new Map();

  /**
   * Gets or creates a rate limiter for a given project.
   * @param {string} projectId - The ID of the project.
   * @param {object} settings - The rate limit settings from the project.
   * @returns {Function} The express-rate-limit middleware.
   */
  get(projectId, settings) {
    if (this.#limiters.has(projectId.toString())) {
      // In a real app, you might check if settings have changed
      // and update the limiter if necessary.
      return this.#limiters.get(projectId.toString());
    }

    const newLimiter = this.create(settings);
    this.#limiters.set(projectId.toString(), newLimiter);
    return newLimiter;
  }

  /**
   * Creates a new rate limiter instance based on settings.
   * @param {object} settings - The rate limit configuration.
   * @returns {Function} The express-rate-limit middleware.
   */
  create(settings) {
    if (!settings || !settings.enabled) {
      return (req, res, next) => next(); // No-op middleware
    }

    return rateLimit({
      windowMs: settings.windowMs || 15 * 60 * 1000, // 15 minutes
      max: settings.max || 100,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.ip,
      message: {
        error: "RATE_LIMIT_EXCEEDED",
        message:
          settings.message || "Too many requests, please try again later.",
      },
    });
  }
}
