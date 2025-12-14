import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { randomUUID } from "crypto";
import { ErrorTypes } from "./utils/errors.js";
import logger from "/opt/nodejs/utils/logger.js";
import { createResponse } from "/opt/nodejs/utils/api.js";

const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION,
});

export const handler = async (event) => {
  logger.info("startWorkflow invoked");

  let body;
  try {
    body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch {
    return createResponse(400, {
      error: ErrorTypes.INVALID_INPUT,
      message: "Invalid JSON body",
    });
  }

  const { input, workflow } = body;

  if (!workflow?.nodes || !workflow?.edges) {
    return createResponse(400, {
      error: ErrorTypes.WORKFLOW_NOT_FOUND,
      message: "Invalid workflow structure",
    });
  }

  if (typeof input !== "object" || Array.isArray(input)) {
    return createResponse(400, {
      error: ErrorTypes.INVALID_INPUT,
      message: "Input must be an object",
    });
  }

  const executionId = `exec_${Date.now()}_${randomUUID().slice(0, 8)}`;

  const payload = {
    executionId,
    workflow,
    initialInput: input,
    requestContext: {
      params: event.pathParameters,
      headers: event.headers,
      body,
    },
  };

  const invokeCommand = new InvokeCommand({
    FunctionName: process.env.ORCHESTRATOR_FUNCTION_NAME,
    InvocationType: "Event", // async
    Payload: JSON.stringify(payload),
  });

  try {
    await lambdaClient.send(invokeCommand);
    logger.info(`Orchestrator triggered: ${executionId}`);
  } catch (error) {
    logger.error("Lambda invoke failed", error);
    return createResponse(500, {
      error: ErrorTypes.INTERNAL_SERVER_ERROR,
      message: "Failed to start workflow",
    });
  }

  const websocketUrl = `wss://${process.env.WEBSOCKET_API_ID}.execute-api.${process.env.AWS_REGION}.amazonaws.com/${process.env.STAGE}?executionId=${executionId}`;

  return createResponse(202, {
    executionId,
    status: "started",
    websocketUrl,
  });
};
