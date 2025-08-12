import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { randomUUID } from "crypto";
import { ErrorTypes } from "./utils/errors.js";
import logger from "/opt/nodejs/utils/logger.js";
import { createResponse } from "/opt/nodejs/utils/api.js";

const isOffline = process.env.IS_OFFLINE === "true";

const lambdaClientConfig = {
  region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
  // If running offline, point to the local serverless-offline endpoint.
  ...(isOffline && {
    endpoint: `http://localhost:${process.env.LAMBDA_HTTP_PORT || 3004}`,
    credentials: {
      accessKeyId: "offline",
      secretAccessKey: "offline",
    },
  }),
};

// Log configuration for debugging
if (isOffline) {
  logger.info(`Lambda client config: ${JSON.stringify(lambdaClientConfig)}`);
  logger.info(`IS_OFFLINE: ${isOffline}`);
  logger.info(`LAMBDA_HTTP_PORT: ${process.env.LAMBDA_HTTP_PORT}`);
  logger.info(`AWS_REGION: ${process.env.AWS_REGION}`);
}

const lambdaClient = new LambdaClient(lambdaClientConfig);

export const handler = async (event) => {
  logger.info("startWorkflow invoked");

  logger.info(
    `Environment variables debug: ${JSON.stringify({
      WEBSOCKET_API_ID: process.env.WEBSOCKET_API_ID,
      AWS_REGION: process.env.AWS_REGION,
      AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION,
      STAGE: process.env.STAGE,
      IS_OFFLINE: process.env.IS_OFFLINE,
      WEBSOCKET_API_PORT: process.env.WEBSOCKET_API_PORT,
    })}`
  );

  let body;
  try {
    body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch (error) {
    logger.error("Failed to parse request body:", error);
    return createResponse(400, {
      error: ErrorTypes.INVALID_INPUT,
      message: "Invalid JSON in request body.",
    });
  }

  const { input, workflow } = body;

  // --- Validation ---
  if (!workflow || !workflow.nodes || !workflow.edges) {
    return createResponse(400, {
      error: ErrorTypes.WORKFLOW_NOT_FOUND,
      message: "A valid workflow object with nodes and edges is required.",
    });
  }
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return createResponse(400, {
      error: ErrorTypes.INVALID_INPUT,
      message: "Input must be a plain object.",
    });
  }

  const timestamp = Date.now();
  const uuid = randomUUID().substring(0, 8); // Take first 8 characters only
  const executionId = `exec_${timestamp}_${uuid}`;

  // --- Prepare Payload for Orchestrator ---
  const invokePayload = {
    executionId,
    workflow,
    initialInput: input,
    requestContext: {
      // Pass necessary request data to the orchestrator
      params: event.pathParameters,
      body: body, // The full original body
      headers: event.headers,
      // Note: The full 'req' object from Express is not available.
      // We pass the relevant parts from the API Gateway event.
    },
  };

  const functionName =
    process.env.ORCHESTRATOR_FUNCTION_NAME ||
    "dotportion-realtime-api-dev-orchestrator";

  if (isOffline) {
    logger.info("ORCHESTRATOR_FUNCTION_NAME:", functionName);
    logger.info("Invoke payload:", JSON.stringify(invokePayload, null, 2));
  }

  const invokeCommand = new InvokeCommand({
    FunctionName: functionName,
    InvocationType: "Event", // Asynchronous invocation
    Payload: JSON.stringify(invokePayload),
  });

  if (isOffline) {
    logger.info(
      "Invoke command:",
      JSON.stringify(
        {
          FunctionName: invokeCommand.input.FunctionName,
          InvocationType: invokeCommand.input.InvocationType,
          PayloadLength: invokeCommand.input.Payload?.length || 0,
        },
        null,
        2
      )
    );
    logger.info(`event: ${JSON.stringify(event.requestContext)}`);
  }

  try {
    // Debug: Test if we can reach the lambda endpoint
    if (isOffline) {
      logger.info("Testing lambda endpoint connectivity...");

      // Test 1: List available functions (non-blocking)
      fetch(
        `http://localhost:${
          process.env.LAMBDA_HTTP_PORT || 3004
        }/2015-03-31/functions/`,
        {
          method: "GET",
        }
      )
        .then((response) => {
          logger.info("List functions response status:", response.status);
          if (response.ok) {
            return response.json();
          }
        })
        .then((functions) => {
          if (functions) {
            logger.info(
              "Available functions:",
              JSON.stringify(functions, null, 2)
            );
          }
        })
        .catch((listError) => {
          logger.error("List functions request failed:", listError);
        });

      // Test 2: Try direct invocation (non-blocking)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      fetch(
        `http://localhost:${
          process.env.LAMBDA_HTTP_PORT || 3004
        }/2015-03-31/functions/${functionName}/invocations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invokePayload),
          signal: controller.signal,
        }
      )
        .then((response) => {
          clearTimeout(timeoutId);
          logger.info("Test response status:", response.status);
          logger.info(
            "Test response headers:",
            Object.fromEntries(response.headers.entries())
          );

          if (!response.ok) {
            return response.text().then((errorText) => {
              logger.error("Test response error:", errorText);
            });
          } else {
            logger.info("Direct HTTP invocation successful!");
          }
        })
        .catch((testError) => {
          clearTimeout(timeoutId);
          if (testError.name === "AbortError") {
            logger.info(
              "Direct HTTP invocation timed out (expected for async execution)"
            );
          } else {
            logger.error("Test request failed:", testError);
          }
        });
    } else {
      // Only use AWS SDK invocation in production
      logger.info("Attempting AWS SDK lambda invocation...");

      // Improve error handling for async invocation
      try {
        const result = await lambdaClient.send(invokeCommand);
        const logData = {
          statusCode: result.StatusCode,
          functionError: result.FunctionError,
          executionId: executionId,
        };

        // Only try to parse payload if it exists and has content
        if (result.Payload && result.Payload.length > 0) {
          try {
            const payloadString = Buffer.from(result.Payload).toString("utf8");
            if (payloadString.trim()) {
              logData.payload = JSON.parse(payloadString);
            }
          } catch (parseError) {
            logger.warn(
              "Failed to parse Lambda response payload:",
              parseError.message
            );
            // Log the raw payload for debugging
            logData.rawPayload = Buffer.from(result.Payload).toString("utf8");
          }
        }

        logger.info(`Lambda invocation result: ${JSON.stringify(logData)}`);

        if (result.FunctionError) {
          logger.error(
            "Lambda function returned an error:",
            result.FunctionError
          );

          // Handle error payload if present
          if (result.Payload && result.Payload.length > 0) {
            try {
              const payloadString = Buffer.from(result.Payload).toString(
                "utf8"
              );
              if (payloadString.trim()) {
                const errorPayload = JSON.parse(payloadString);
                logger.error("Lambda error payload:", errorPayload);
              }
            } catch (parseError) {
              logger.error(
                "Failed to parse error payload:",
                parseError.message
              );
              logger.error(
                "Raw error payload:",
                Buffer.from(result.Payload).toString("utf8")
              );
            }
          }
        }
      } catch (error) {
        logger.error(`Lambda invocation failed: ${error}`);
        // Log additional error details for debugging
        logger.error(
          `Lambda invocation error details: ${JSON.stringify({
            name: error.name,
            message: error.message,
            code: error.$metadata?.httpStatusCode,
            requestId: error.$metadata?.requestId,
          })}`
        );

        // Re-throw the error to be caught by the outer catch block
        throw error;
      }
    }

    logger.info(
      `Successfully initiated orchestrator for executionId: ${executionId}`
    );

    let websocketUrl;
    if (isOffline) {
      websocketUrl = `ws://localhost:${
        process.env.WEBSOCKET_API_PORT || 3001
      }?executionId=${executionId}`;
    } else {
      // For production, construct the URL using the actual WebSocket API ID
      const websocketApiId = process.env.WEBSOCKET_API_ID;
      const region =
        process.env.AWS_REGION ||
        process.env.AWS_DEFAULT_REGION ||
        "ap-south-1";
      const stage = process.env.STAGE || "dev";

      logger.info("WebSocket URL construction debug:", {
        websocketApiId,
        region,
        stage,
        rawWebsocketApiId: JSON.stringify(process.env.WEBSOCKET_API_ID),
      });

      if (
        !websocketApiId ||
        websocketApiId.includes("Ref:") ||
        websocketApiId.includes("${")
      ) {
        // If we still have a CloudFormation reference, we need to handle this differently
        logger.error(
          "WEBSOCKET_API_ID contains CloudFormation reference:",
          websocketApiId
        );

        // Fallback: Try to extract the API ID from event context or use a hardcoded approach
        // This is a temporary workaround - you should fix the serverless.yml
        const fallbackApiId = event.requestContext?.domainName?.split(".")[0];
        if (fallbackApiId) {
          websocketUrl = `wss://${fallbackApiId}.execute-api.${region}.amazonaws.com/${stage}?executionId=${executionId}`;
          logger.info(
            "Using fallback WebSocket API ID from request context:",
            fallbackApiId
          );
        } else {
          // Last resort - use the API ID from your response (sf3q9ps0j4)
          websocketUrl = `wss://sf3q9ps0j4.execute-api.${region}.amazonaws.com/${stage}?executionId=${executionId}`;
          logger.warn("Using hardcoded WebSocket API ID as fallback");
        }
      } else {
        websocketUrl = `wss://${websocketApiId}.execute-api.${region}.amazonaws.com/${stage}?executionId=${executionId}`;
      }
    }

    logger.info("Final WebSocket URL:", websocketUrl);

    // --- Return immediately without waiting ---
    return createResponse(202, {
      executionId,
      status: "started",
      message:
        "Workflow execution started. Connect to the WebSocket for updates.",
      websocketUrl,
      debug: {
        websocketApiId: process.env.WEBSOCKET_API_ID,
        region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
        stage: process.env.STAGE,
      },
    });
  } catch (error) {
    logger.error(`Failed to invoke orchestrator lambda: ${error}`);
    logger.error("Error details:", {
      name: error.name,
      message: error.message,
      code: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId,
      cfId: error.$metadata?.cfId,
      extendedRequestId: error.$metadata?.extendedRequestId,
      attempts: error.$metadata?.attempts,
      totalRetryDelay: error.$metadata?.totalRetryDelay,
    });

    // Debug: Log the full error object
    logger.error(
      "Full error object:",
      JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    );

    return createResponse(500, {
      error: ErrorTypes.INTERNAL_SERVER_ERROR,
      message: "Failed to start workflow execution.",
    });
  }
};
