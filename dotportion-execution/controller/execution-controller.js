import { ErrorTypes } from "../utils/errors.js";

export class ExecutionController {
  constructor(executionService, logger) {
    this.executionService = executionService;
    this.logger = logger;
    this.logger.info(`-->Execution Controller initialized`);
  }

  async executeWorkflow(event) {
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    this.logger.info(`[${requestId}] -->executeWorkflow Controller Started`);

    try {
      // Extract path parameters
      const { tenant, projectId, path } = event.pathParameters;
      this.logger.info(
        `[${requestId}] Extracted path parameters: ${tenant} ${projectId} ${path}`
      );

      if (!tenant || !projectId || !path) {
        this.logger.error(
          `[${requestId}] Missing required path parameters: ${tenant} ${projectId} ${path}`
        );
        return this.executionService.formatErrorResponse({
          status: 400,
          type: ErrorTypes.MISSING_PARAMS,
          message:
            "Missing required path parameters: tenant, projectId, or path",
        });
      }

      // Create mock request object
      this.logger.info(`[${requestId}] Creating mock request object...`);
      const requestData = this.executionService.createMockRequest(event);
      this.logger.info(
        `[${requestId}] Mock request created: ${JSON.stringify(requestData)}`
      );

      // Load project data first
      this.logger.info(
        `[${requestId}] Loading project data for projectId: ${projectId}`
      );
      const project = await this.executionService.findProjectById(projectId);
      if (!project) {
        this.logger.error(
          `[${requestId}] Project not found for projectId: ${projectId}`
        );
        return this.executionService.formatErrorResponse({
          status: 404,
          type: ErrorTypes.PROJECT_NOT_FOUND,
          message: "Project not found",
        });
      }
      this.logger.info(`[${requestId}] Project loaded successfully:`, {
        projectId: project._id,
        projectName: project.name,
        tenant: project.tenant,
      });

      // Handle CORS (pre-flight and main request)
      this.logger.info(
        `[${requestId}] Handling CORS for project: ${project._id}`
      );
      const corsResponse = this.executionService.handleCors(
        requestData,
        project
      );
      this.logger.info(
        `[${requestId}] CORS response:`,
        JSON.stringify(corsResponse, null, 2)
      );

      if (corsResponse.isPreflight) {
        this.logger.info(`[${requestId}] Returning preflight response`);
        return corsResponse.response;
      }

      // Apply Rate Limiting
      this.logger.info(
        `[${requestId}] Applying rate limiting for project: ${project._id}`
      );
      try {
        await this.executionService.applyRateLimiting(project, requestData);
        this.logger.info(`[${requestId}] Rate limiting passed`);
      } catch (rateLimitError) {
        this.logger.error(
          `[${requestId}] Rate limiting failed:`,
          rateLimitError
        );
        return this.executionService.formatErrorResponse(rateLimitError);
      }

      // Load workflow data
      this.logger.info(
        `[${requestId}] Loading workflow for tenant: ${tenant}, path: ${path}, method: ${requestData.method}`
      );
      const workflow = await this.executionService.getWorkflowByTenantAndPath(
        tenant,
        path,
        requestData.method
      );

      if (!workflow) {
        this.logger.error(
          `[${requestId}] Workflow not found for tenant: ${tenant}, path: ${path}, method: ${requestData.method}`
        );
        return this.executionService.formatErrorResponse({
          status: 404,
          type: ErrorTypes.WORKFLOW_NOT_FOUND,
          message: "Workflow not found or not deployed",
        });
      }
      this.logger.info(`[${requestId}] Workflow loaded successfully:`, {
        workflowId: workflow._id,
        workflowName: workflow.name,
        projectId: workflow.project,
      });

      // Execute Workflow and Log Stats
      this.logger.info(`[${requestId}] Starting workflow execution...`);
      const startTime = Date.now();
      let result,
        status,
        logId,
        logFinalized = false;

      try {
        this.logger.info(`[${requestId}] Calling workflow executor...`);
        const executionResult = await this.executionService.executeWorkflow(
          workflow,
          requestData
        );
        result = executionResult.result;
        logId = executionResult.logId;
        logFinalized = executionResult.logFinalized;
        status = "success"; // Always mark as success if execution completed without throwing an error
        this.logger.info(
          `[${requestId}] Workflow execution completed with status: ${status}`,
          {
            resultStatus: result?.status,
            hasData: !!result?.data,
            hasToken: !!result?.token,
            logId,
            logFinalized,
          }
        );
      } catch (executionError) {
        this.logger.error(
          `[${requestId}] Workflow execution failed:`,
          executionError
        );
        status = "fail"; // Use "fail" instead of "error" for log status
        result = {
          error: executionError.message,
          details: executionError.details,
          status: executionError.status || 500,
        };
        // Extract logId and logFinalized from the error if it exists (for failed executions)
        logId = executionError.logId || logId;
        logFinalized = executionError.logFinalized || logFinalized;
        throw executionError; // Re-throw to be caught by the main handler
      } finally {
        const durationMs = Date.now() - startTime;
        this.logger.info(
          `[${requestId}] Updating stats with duration: ${durationMs}ms`
        );
        await this.executionService.updateStats(
          workflow,
          status,
          durationMs,
          requestData,
          result,
          logId,
          logFinalized
        );
        this.logger.info(`[${requestId}] Stats updated successfully`);
      }

      // Format and send success response
      this.logger.info(`[${requestId}] Formatting success response...`);
      const response = this.executionService.formatSuccessResponse(
        result,
        corsResponse.headers
      );
      this.logger.info(`[${requestId}] Success response formatted:`, {
        statusCode: response.statusCode,
        hasHeaders: !!response.headers,
        bodyLength: response.body?.length || 0,
      });
      return response;
    } catch (error) {
      this.logger.error(`[${requestId}] Error executing workflow:`, error);
      const errorResponse = this.executionService.formatErrorResponse(error);
      this.logger.info(`[${requestId}] Error response formatted:`, {
        statusCode: errorResponse.statusCode,
        errorType: error.type || "UNKNOWN",
      });
      return errorResponse;
    }
  }
}
