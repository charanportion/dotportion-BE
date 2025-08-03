import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import logger from "/opt/nodejs/utils/logger.js";

export class WebSocketService {
  #apiGatewayClient;
  #isOffline;

  constructor() {
    this.#isOffline = process.env.IS_OFFLINE === "true";

    if (this.#isOffline) {
      // For offline mode, use local WebSocket endpoint
      const websocketPort = process.env.WEBSOCKET_API_PORT || 3001;
      const endpoint = `http://localhost:${websocketPort}`;

      logger.info(
        `WebSocketService initialized for offline mode with endpoint: ${endpoint}`
      );

      this.#apiGatewayClient = new ApiGatewayManagementApiClient({
        region:
          process.env.AWS_REGION ||
          process.env.AWS_DEFAULT_REGION ||
          "ap-south-1",
        endpoint: endpoint,
        credentials: {
          accessKeyId: "offline",
          secretAccessKey: "offline",
        },
      });
    } else {
      // For production, use the configured WebSocket API
      const websocketApiId = process.env.WEBSOCKET_API_ID;
      const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
      const stage = process.env.STAGE;

      if (!websocketApiId) {
        logger.error("WEBSOCKET_API_ID environment variable is not set");
        throw new Error(
          "WEBSOCKET_API_ID environment variable is required for WebSocket communication"
        );
      }

      const endpoint = `https://${websocketApiId}.execute-api.${region}.amazonaws.com/${stage}`;
      logger.info(
        `WebSocketService initialized for production with endpoint: ${endpoint}`
      );

      this.#apiGatewayClient = new ApiGatewayManagementApiClient({
        region: region,
        endpoint: endpoint,
      });
    }
  }

  async sendMessage(connectionId, payload) {
    if (!connectionId) {
      logger.warn("Cannot send WebSocket message: connectionId is required");
      return;
    }

    const command = new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(payload),
    });

    try {
      await this.#apiGatewayClient.send(command);
      logger.debug(
        `Successfully sent WebSocket message to connection ${connectionId}`
      );
    } catch (error) {
      if (error.statusCode === 410) {
        logger.warn(
          `Connection ${connectionId} is stale. It will be cleaned up.`
        );
      } else {
        logger.error(
          `Error sending message to WebSocket: ${error.message} ${error.statusCode}`
        );
        logger.error("WebSocket error details:", {
          connectionId,
          endpoint: this.#apiGatewayClient.config.endpoint,
          isOffline: this.#isOffline,
        });
      }
      throw error;
    }
  }
}
