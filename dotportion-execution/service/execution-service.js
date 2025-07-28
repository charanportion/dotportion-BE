import { WorkflowExecutor } from "./WorkflowExecutor.js";
import { RateLimiterFactory } from "../RateLimiterFactory.js";
import { StatsUpdater } from "../StatsUpdater.js";
import { ErrorTypes } from "../utils/errors.js";
import { SecretService } from "./SecretService.js";

export class ExecutionService {
  constructor(dbHandler, logger, WorkflowModel, ProjectModel, SecretModel) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.WorkflowModel = WorkflowModel;
    this.ProjectModel = ProjectModel;
    this.SecretModel = SecretModel;
    this.secretService = new SecretService(dbHandler, logger, SecretModel);
    this.workflowExecutor = new WorkflowExecutor(this.secretService);
    this.workflowExecutor.initialize();
    this.rateLimiterFactory = new RateLimiterFactory();
    this.statsUpdater = new StatsUpdater();
    this.logger.info(`-->Execution Service initialized`);
  }

  async getWorkflowByTenantAndPath(tenant, path, method) {
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    try {
      this.logger.info(
        `[${requestId}] -->getWorkflowByTenantAndPath service invoked with path: ${path}, method: ${method}, tenant: ${tenant}`
      );

      this.logger.info(`[${requestId}] Connecting to database...`);
      await this.dbHandler.connectDb();
      this.logger.info(`[${requestId}] Database connected successfully`);

      this.logger.info(`[${requestId}] Querying workflow with criteria:`, {
        path,
        method,
        isDeployed: true,
      });

      const workflow = await this.WorkflowModel.findOne({
        tenant: tenant,
        path: path,
        method: method,
        isDeployed: true,
      }).populate("project");

      if (!workflow) {
        this.logger.warn(
          `[${requestId}] No deployed workflow found for path: ${path}, method: ${method}`
        );
        return null;
      }

      // Check if the workflow belongs to the correct tenant
      if (workflow.tenant !== tenant) {
        this.logger.warn(
          `[${requestId}] Workflow tenant mismatch. Expected: ${tenant}, Found: ${workflow.project.tenant}`
        );
        return null;
      }

      this.logger.info(
        `[${requestId}] Workflow validation passed - returning workflow`
      );
      return workflow;
    } catch (error) {
      this.logger.error(
        `[${requestId}] Error in getWorkflowByTenantAndPath service:`,
        error
      );
      return null;
    }
  }

  async findProjectById(projectId) {
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    try {
      this.logger.info(
        `[${requestId}] -->findProjectById service invoked with projectId: ${projectId}`
      );

      this.logger.info(`[${requestId}] Connecting to database...`);
      await this.dbHandler.connectDb();
      this.logger.info(`[${requestId}] Database connected successfully`);

      this.logger.info(`[${requestId}] Querying project with ID: ${projectId}`);
      const project = await this.ProjectModel.findById(projectId);

      if (!project) {
        this.logger.warn(
          `[${requestId}] No project found with ID: ${projectId}`
        );
        return null;
      }

      this.logger.info(`[${requestId}] Project found:`, {
        projectId: project._id,
        projectName: project.name,
        tenant: project.tenant,
        hasRateLimit: !!project.rateLimit,
        hasCors: !!project.cors,
      });

      return project;
    } catch (error) {
      this.logger.error(
        `[${requestId}] Error in findProjectById service:`,
        error
      );
      return null;
    }
  }

  async executeWorkflow(workflow, requestData) {
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    try {
      this.logger.info(
        `[${requestId}] -->executeWorkflow service invoked with workflowId: ${workflow._id}`
      );

      this.logger.info(`[${requestId}] Workflow details:`, {
        workflowId: workflow._id,
        workflowName: workflow.name,
        nodeCount: workflow.nodes?.length || 0,
        edgeCount: workflow.edges?.length || 0,
      });

      this.logger.info(`[${requestId}] Request data:`, {
        method: requestData.method,
        path: requestData.path,
        hasBody: !!requestData.body,
        bodyKeys: requestData.body ? Object.keys(requestData.body) : [],
        hasHeaders: !!requestData.headers,
        headerCount: requestData.headers
          ? Object.keys(requestData.headers).length
          : 0,
      });

      this.logger.info(`[${requestId}] Calling workflow executor...`);
      const result = await this.workflowExecutor.execute(workflow, requestData);

      this.logger.info(
        `[${requestId}] Workflow execution completed successfully:`,
        {
          hasResult: !!result,
          resultType: typeof result,
          status: result?.status,
          hasData: !!result?.data,
          hasToken: !!result?.token,
        }
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[${requestId}] Error in executeWorkflow service:`,
        error
      );
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: error.message || "Workflow execution failed",
        details: error.details || {},
      };
    }
  }

  async applyRateLimiting(project, requestData) {
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    try {
      this.logger.info(
        `[${requestId}] -->applyRateLimiting service invoked for projectId: ${project._id}`
      );

      this.logger.info(
        `[${requestId}] Project rate limit settings:`,
        project.rateLimit || "No rate limit configured"
      );

      const rateLimiter = this.rateLimiterFactory.get(
        project._id.toString(),
        project.rateLimit
      );

      this.logger.info(
        `[${requestId}] Rate limiter created/retrieved for project: ${project._id}`
      );

      // Create a mock response object for the rate limiter
      const mockRes = {
        getHeader: () => {},
        setHeader: () => {},
        status: (code) => ({
          json: (data) => {
            this.logger.warn(`[${requestId}] Rate limit exceeded:`, {
              code,
              data,
            });
            throw {
              status: code,
              type: ErrorTypes.RATE_LIMIT_EXCEEDED,
              message: data.message || "Rate limit exceeded",
            };
          },
        }),
      };

      this.logger.info(
        `[${requestId}] Applying rate limiting with mock request:`,
        {
          ip: requestData.ip,
          method: requestData.method,
          path: requestData.path,
        }
      );

      // Apply rate limiting
      return new Promise((resolve, reject) => {
        rateLimiter(requestData, mockRes, (err) => {
          if (err) {
            this.logger.error(`[${requestId}] Rate limiting error:`, err);
            reject({
              status: 429,
              type: ErrorTypes.RATE_LIMIT_EXCEEDED,
              message: err.message || "Rate limit exceeded",
            });
          } else {
            this.logger.info(
              `[${requestId}] Rate limiting passed successfully`
            );
            resolve();
          }
        });
      });
    } catch (error) {
      this.logger.error(
        `[${requestId}] Error in applyRateLimiting service:`,
        error
      );
      throw error;
    }
  }

  async updateStats(workflow, status, durationMs, requestData, responseData) {
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    try {
      this.logger.info(
        `[${requestId}] -->updateStats service invoked for workflowId: ${workflow._id}`
      );

      this.logger.info(`[${requestId}] Stats update parameters:`, {
        projectId: workflow.project,
        workflowId: workflow._id,
        status,
        durationMs,
        requestMethod: requestData.method,
        requestPath: requestData.path,
        hasResponseData: !!responseData,
      });

      await this.statsUpdater.update({
        projectId: workflow.project,
        workflowId: workflow._id,
        status,
        durationMs,
        request: {
          method: requestData.method,
          path: requestData.path,
          headers: requestData.headers,
          body: requestData.body,
        },
        response: responseData,
      });

      this.logger.info(`[${requestId}] Stats updated successfully`);
    } catch (error) {
      this.logger.error(`[${requestId}] Error in updateStats service:`, error);
      // Don't throw error for stats update failures
    }
  }

  handleCors(requestData, project) {
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    try {
      this.logger.info(
        `[${requestId}] -->handleCors service invoked for projectId: ${project._id}`
      );

      const corsSettings = project.cors || {
        allowedOrigins: ["*"],
        allowedMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      };

      this.logger.info(`[${requestId}] CORS settings:`, corsSettings);

      const headers = {
        "Access-Control-Allow-Methods": corsSettings.allowedMethods.join(", "),
        "Access-Control-Allow-Headers": corsSettings.allowedHeaders.join(", "),
      };

      const origin = requestData.headers.origin;
      this.logger.info(`[${requestId}] Request origin: ${origin}`);

      if (corsSettings.allowedOrigins.includes("*")) {
        headers["Access-Control-Allow-Origin"] = "*";
        this.logger.info(`[${requestId}] Allowing all origins (*)`);
      } else if (origin && corsSettings.allowedOrigins.includes(origin)) {
        headers["Access-Control-Allow-Origin"] = origin;
        this.logger.info(`[${requestId}] Allowing specific origin: ${origin}`);
      } else if (origin) {
        this.logger.error(`[${requestId}] Origin not allowed: ${origin}`);
        throw {
          status: 403,
          type: ErrorTypes.CORS_ERROR,
          message: "Origin not allowed",
        };
      }

      if (requestData.method === "OPTIONS") {
        this.logger.info(`[${requestId}] Handling OPTIONS preflight request`);
        return {
          isPreflight: true,
          response: {
            statusCode: 204,
            headers: { ...headers, "Access-Control-Max-Age": "86400" },
          },
        };
      }

      this.logger.info(`[${requestId}] CORS headers generated:`, headers);
      return { isPreflight: false, headers };
    } catch (error) {
      this.logger.error(`[${requestId}] Error in handleCors service:`, error);
      throw error;
    }
  }

  createMockRequest(event) {
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    try {
      this.logger.info(
        `[${requestId}] -->createMockRequest service invoked ${JSON.stringify(
          event
        )}`
      );

      this.logger.info(
        `[${requestId}] Event structure: ${JSON.stringify({
          hasHttpMethod: !!event.httpMethod,
          hasPathParameters: !!event.pathParameters,
          hasQueryStringParameters: !!event.queryStringParameters,
          hasHeaders: !!event.headers,
          hasBody: !!event.body,
          hasRequestContext: !!event.requestContext,
        })}`
      );

      // Handle body parsing - it could be a string or already an object
      let parsedBody = {};
      if (event.body) {
        if (typeof event.body === "string") {
          try {
            parsedBody = JSON.parse(event.body);
          } catch (parseError) {
            this.logger.warn(
              `[${requestId}] Failed to parse body as JSON, treating as string:`,
              parseError.message
            );
            parsedBody = { rawBody: event.body };
          }
        } else if (typeof event.body === "object") {
          parsedBody = event.body;
        }
      }

      // Adapt serverless event to an Express-like request object
      const mockRequest = {
        method: event.httpMethod,
        params: event.pathParameters,
        query: event.queryStringParameters || {},
        headers: event.headers || {},
        body: parsedBody,
        ip: event.requestContext?.identity?.sourceIp || "127.0.0.1",
        path: event.pathParameters?.path || "",
      };

      this.logger.info(
        `[${requestId}] Mock request created: ${JSON.stringify(mockRequest)}`
      );

      return mockRequest;
    } catch (error) {
      this.logger.error(
        `[${requestId}] Error in createMockRequest service:`,
        error
      );
      throw error;
    }
  }

  formatSuccessResponse(result, corsHeaders = {}) {
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    try {
      this.logger.info(
        `[${requestId}] -->formatSuccessResponse service invoked`
      );

      const statusCode = result.status || 200;
      const body = result.token
        ? { token: result.token, data: result.data }
        : result.data;

      this.logger.info(`[${requestId}] Response details:`, {
        statusCode,
        hasToken: !!result.token,
        hasData: !!result.data,
        bodyType: typeof body,
      });

      const response = {
        statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      };

      this.logger.info(`[${requestId}] Success response formatted:`, {
        statusCode: response.statusCode,
        headerCount: Object.keys(response.headers).length,
        bodyLength: response.body.length,
      });

      return response;
    } catch (error) {
      this.logger.error(
        `[${requestId}] Error in formatSuccessResponse service:`,
        error
      );
      throw error;
    }
  }

  formatErrorResponse(error) {
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    try {
      this.logger.info(`[${requestId}] -->formatErrorResponse service invoked`);

      this.logger.error(`[${requestId}] Error details:`, {
        type: error.type,
        message: error.message,
        status: error.status,
        hasDetails: !!error.details,
      });

      const errorType = error.type || ErrorTypes.EXECUTION_FAILED;
      const response = {
        error: errorType,
        message: error.message || "An internal server error occurred.",
        ...(error.details && { details: error.details }),
      };

      const formattedResponse = {
        statusCode: error.status || 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
      };

      this.logger.info(`[${requestId}] Error response formatted:`, {
        statusCode: formattedResponse.statusCode,
        errorType: response.error,
        bodyLength: formattedResponse.body.length,
      });

      return formattedResponse;
    } catch (err) {
      this.logger.error(
        `[${requestId}] Error in formatErrorResponse service:`,
        err
      );
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while processing the request.",
        }),
      };
    }
  }
}
