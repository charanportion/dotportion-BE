import { ErrorTypes, ErrorMessages } from "./utils/errors.js";
import logger from "../layers/common/nodejs/utils/logger.js";

export class ApiHandler {
  // Private fields for dependencies
  #workflowService;
  #projectService;
  #workflowExecutor;
  #statsUpdater;
  #rateLimiterFactory;

  // Dependencies are injected via the constructor
  constructor({
    workflowService,
    projectService,
    workflowExecutor,
    statsUpdater,
    rateLimiterFactory,
  }) {
    this.#workflowService = workflowService;
    this.#projectService = projectService;
    this.#workflowExecutor = workflowExecutor;
    this.#statsUpdater = statsUpdater;
    this.#rateLimiterFactory = rateLimiterFactory;
  }

  /**
   * Main entry point for all incoming serverless requests.
   * @param {object} event - The serverless event object (e.g., from API Gateway).
   * @returns {Promise<object>} A serverless response object.
   */
  async handleRequest(event) {
    try {
      // 1. Load workflow and project data
      const { tenant, projectId, path } = event.pathParameters;
      const workflow = await this.#workflowService.getWorkflowByTenantAndPath(
        tenant,
        path,
        event.httpMethod
      );
      if (!workflow || !workflow.isDeployed) {
        throw { status: 404, type: ErrorTypes.WORKFLOW_NOT_FOUND };
      }

      const project = await this.#projectService.findProjectById(
        workflow.project
      );
      if (!project) {
        throw { status: 404, type: ErrorTypes.PROJECT_NOT_FOUND };
      }

      // Re-create a mock `req` object for compatibility with existing libraries
      const req = this.#createMockRequest(event);

      // 2. Apply Rate Limiting
      await this.#applyRateLimiting(project, req);

      // 3. Handle CORS (pre-flight and main request)
      const corsResponse = this.#handleCors(req, project);
      if (corsResponse.isPreflight) {
        return corsResponse.response;
      }

      // 4. Execute Workflow and Log Stats
      const result = await this.#executeAndLog(workflow, req);

      // 5. Format and send success response
      return this.#formatSuccessResponse(result, corsResponse.headers);
    } catch (error) {
      // 6. Centralized error handling
      logger.error("API Handler Error:", error);
      return this.#formatErrorResponse(error);
    }
  }

  #createMockRequest(event) {
    // Adapt serverless event to an Express-like `req` object for downstream compatibility
    return {
      method: event.httpMethod,
      params: event.pathParameters,
      query: event.queryStringParameters || {},
      headers: event.headers,
      body: event.body ? JSON.parse(event.body) : {},
      ip: event.requestContext?.identity?.sourceIp || "127.0.0.1",
    };
  }

  async #applyRateLimiting(project, req) {
    const rateLimiter = await this.#rateLimiterFactory.get(
      project._id,
      project.rateLimit
    );

    // Wrap the middleware in a promise to handle its async nature
    return new Promise((resolve, reject) => {
      // Create a mock `res` object since the rate-limiter expects it
      const mockRes = {
        getHeader: () => {},
        setHeader: () => {},
        status: () => ({ json: (err) => reject(err) }),
      };

      rateLimiter(req, mockRes, (err) => {
        if (err) {
          reject({
            status: 429,
            type: ErrorTypes.RATE_LIMIT_EXCEEDED,
            message: err.message,
          });
        } else {
          resolve();
        }
      });
    });
  }

  #handleCors(req, project) {
    const corsSettings = project.cors || {
      allowedOrigins: ["*"],
      allowedMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    };

    const headers = {
      "Access-Control-Allow-Methods": corsSettings.allowedMethods.join(", "),
      "Access-Control-Allow-Headers": corsSettings.allowedHeaders.join(", "),
    };

    const origin = req.headers.origin;
    if (corsSettings.allowedOrigins.includes("*")) {
      headers["Access-Control-Allow-Origin"] = "*";
    } else if (origin && corsSettings.allowedOrigins.includes(origin)) {
      headers["Access-Control-Allow-Origin"] = origin;
    } else if (origin) {
      throw {
        status: 403,
        type: ErrorTypes.CORS_ERROR,
        message: "Origin not allowed",
      };
    }

    if (req.method === "OPTIONS") {
      return {
        isPreflight: true,
        response: {
          statusCode: 204,
          headers: { ...headers, "Access-Control-Max-Age": "86400" },
        },
      };
    }

    return { isPreflight: false, headers };
  }

  async #executeAndLog(workflow, req) {
    const start = Date.now();
    let result, status;

    try {
      result = await this.#workflowExecutor.execute(workflow, req);
      status = result?.status < 400 ? "success" : "error";
    } catch (error) {
      status = "error";
      result = { error: error.message, details: error.details };
      throw error; // Re-throw to be caught by the main handler
    } finally {
      const durationMs = Date.now() - start;
      await this.#statsUpdater.update({
        projectId: workflow.project,
        workflowId: workflow._id,
        status,
        durationMs,
        request: {
          /* sanitized request data */
        },
        response: result,
      });
    }
    return result;
  }

  #formatSuccessResponse(result, corsHeaders = {}) {
    const statusCode = result.status || 200;
    const body = result.token
      ? { token: result.token, data: result.data }
      : result.data;

    return {
      statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    };
  }

  #formatErrorResponse(error) {
    const errorType = error.type || ErrorTypes.EXECUTION_FAILED;
    const response = {
      error: errorType,
      message:
        error.message ||
        ErrorMessages[errorType] ||
        "An internal server error occurred.",
      ...(error.details && { details: error.details }),
    };

    return {
      statusCode: error.status || 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response),
    };
  }
}
