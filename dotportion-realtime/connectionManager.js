import { MongoService } from "./service/MongoService.js";
import logger from "/opt/nodejs/utils/logger.js";

const mongoService = new MongoService();

export const handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const routeKey = event.requestContext.routeKey;

  logger.info(
    `WebSocket event received: ${routeKey} for connection: ${connectionId}`
  );
  logger.info(`Event details:`, JSON.stringify(event, null, 2));

  // Additional debugging for WebSocket connection issues
  logger.info("Request context details:", {
    connectionId: event.requestContext?.connectionId,
    routeKey: event.requestContext?.routeKey,
    stage: event.requestContext?.stage,
    apiId: event.requestContext?.apiId,
    domainName: event.requestContext?.domainName,
    eventType: event.requestContext?.eventType,
    requestId: event.requestContext?.requestId,
    requestTime: event.requestContext?.requestTime,
    requestTimeEpoch: event.requestContext?.requestTimeEpoch,
  });

  // Enhanced logging for debugging
  logger.info("Environment check:", {
    MONGO_URI: process.env.MONGO_URI ? "SET" : "NOT SET",
    MDataBase: process.env.MDataBase,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (routeKey === "$connect") {
    const executionId = event.queryStringParameters?.executionId;

    logger.info(
      `Connection attempt - executionId: ${executionId}, connectionId: ${connectionId}`
    );
    logger.info(
      "Query string parameters:",
      JSON.stringify(event.queryStringParameters, null, 2)
    );

    if (!executionId) {
      logger.warn("Connection attempt without executionId");
      logger.info("Available query parameters:", event.queryStringParameters);
      return {
        statusCode: 400,
        body: "executionId query parameter is required.",
      };
    }

    try {
      // Test MongoDB connection first
      logger.info("Testing MongoDB connection...");

      // Save the connection with detailed logging
      logger.info(
        `Attempting to save connection: executionId=${executionId}, connectionId=${connectionId}`
      );

      const saveStartTime = Date.now();
      await mongoService.saveConnection(executionId, connectionId);
      const saveEndTime = Date.now();

      logger.info(
        `Successfully saved connection for executionId: ${executionId} (took ${
          saveEndTime - saveStartTime
        }ms)`
      );

      // Verify the connection was saved
      logger.info("Verifying connection was saved...");
      const verifyStartTime = Date.now();
      const savedConnectionId = await mongoService.getConnectionId(executionId);
      const verifyEndTime = Date.now();

      logger.info(
        `Verification - retrieved connectionId: ${savedConnectionId} for executionId: ${executionId} (took ${
          verifyEndTime - verifyStartTime
        }ms)`
      );

      if (savedConnectionId !== connectionId) {
        logger.error(
          `Connection verification failed! Expected: ${connectionId}, Got: ${savedConnectionId}`
        );
        return {
          statusCode: 500,
          body: JSON.stringify({
            message: "Connection verification failed",
            expected: connectionId,
            actual: savedConnectionId,
          }),
        };
      }

      logger.info("✅ Connection successfully established and verified");

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Connected successfully",
          executionId: executionId,
          connectionId: connectionId,
          timestamp: new Date().toISOString(),
        }),
      };
    } catch (error) {
      logger.error(`Failed to save WebSocket connection:`, error);
      logger.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Failed to establish connection",
          error: error.message,
          errorType: error.name,
        }),
      };
    }
  }

  if (routeKey === "$disconnect") {
    logger.info(`Client disconnected: ${connectionId}`);
    try {
      const deleteStartTime = Date.now();
      await mongoService.deleteConnectionByConnectionId(connectionId);
      const deleteEndTime = Date.now();

      logger.info(
        `Successfully removed connection: ${connectionId} (took ${
          deleteEndTime - deleteStartTime
        }ms)`
      );
      return { statusCode: 200, body: "Disconnected." };
    } catch (error) {
      logger.error(`Failed to remove connection:`, error);
      logger.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      return { statusCode: 500, body: "Disconnect error." };
    }
  }

  // Handle other routes
  logger.info(`Unhandled route: ${routeKey}`);
  return { statusCode: 200, body: "OK" };
};

export const defaultHandler = async (event) => {
  logger.info("Default handler received message:", event.body);
  logger.info("Default handler event:", JSON.stringify(event, null, 2));
  return { statusCode: 200, body: "Message received." };
};
