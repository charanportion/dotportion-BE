import { WebSocketService } from "./service/WebSocketService.js";
import { MongoService } from "./service/MongoService.js";
import { NodeProcessor } from "./utils/NodeProcessor.js";
import { ErrorTypes } from "./utils/errors.js";
import logger from "/opt/nodejs/utils/logger.js";
import { SecretService } from "./service/SecretService.js";
import SecretModel from "/opt/nodejs/models/SecretModel.js";
import { createDBHandler } from "/opt/nodejs/utils/db.js";

const { MONGO_URI, MDataBase } = process.env;
const dbHandler = createDBHandler(MONGO_URI, MDataBase, logger);

export const handler = async (event) => {
  let executionId = null; // Declare at the top level to ensure scope
  let executionData = null;
  let mongoService = null;
  let emitUpdate = null;

  try {
    logger.info("=== ORCHESTRATOR HANDLER STARTED ===");
    logger.info("Orchestrator event received:", JSON.stringify(event, null, 2));

    // Add environment variable debugging
    logger.info("Environment variables check:", {
      MONGO_URI: process.env.MONGO_URI ? "SET" : "NOT SET",
      MDataBase: process.env.MDataBase,
      WEBSOCKET_API_ID: process.env.WEBSOCKET_API_ID,
      STAGE: process.env.STAGE,
      AWS_REGION: process.env.AWS_REGION,
      NODE_ENV: process.env.NODE_ENV,
    });

    const {
      executionId: eventExecutionId,
      workflow,
      initialInput,
      requestContext,
    } = event;

    // Assign to the top-level variable
    executionId = eventExecutionId;

    // Validate required fields
    if (!executionId) {
      throw new Error("executionId is required");
    }
    if (!workflow) {
      throw new Error("workflow is required");
    }
    if (!initialInput) {
      throw new Error("initialInput is required");
    }
    if (!requestContext) {
      throw new Error("requestContext is required");
    }

    logger.info("Extracted data:", {
      executionId,
      hasWorkflow: !!workflow,
      hasInitialInput: !!initialInput,
      hasRequestContext: !!requestContext,
    });

    // Debug: Log the requestContext structure
    logger.info("RequestContext structure:", {
      hasParams: !!requestContext?.params,
      params: requestContext?.params,
      hasBody: !!requestContext?.body,
      hasHeaders: !!requestContext?.headers,
    });

    // --- Initialize Services ---
    const webSocketService = new WebSocketService();
    mongoService = new MongoService();
    const secretService = new SecretService(dbHandler, logger, SecretModel);
    const nodeProcessor = new NodeProcessor(secretService);

    emitUpdate = async (eventType, payload) => {
      try {
        const connectionId = await mongoService.getConnectionId(executionId);
        logger.info(
          `Attempting to send ${eventType} to connection: ${connectionId} for execution: ${executionId}`
        );

        if (connectionId) {
          const message = {
            event: eventType,
            data: payload,
            executionId,
            timestamp: new Date().toISOString(),
          };

          await webSocketService.sendMessage(connectionId, message);
          logger.info(
            `Successfully sent ${eventType} event to connectionId: ${connectionId}`
          );
        } else {
          logger.warn(
            `No active connection found for executionId ${executionId} to send event ${eventType}`
          );
        }
      } catch (error) {
        logger.error(`Failed to emit ${eventType} event:`, error);
      }
    };

    executionData = {
      id: executionId,
      workflowId:
        requestContext.params?.tenant && requestContext.params?.path
          ? `${requestContext.params.tenant}/${requestContext.params.path}`
          : "default-workflow",
      status: "running",
      startedAt: new Date(),
      nodes: {},
      context: {},
      output: null,
    };

    logger.info(`Orchestrator starting for executionId: ${executionId}`);

    const waitForConnection = async (timeout = 15000, interval = 500) => {
      logger.info(
        `Waiting for WebSocket connection for executionId: ${executionId}...`
      );
      await emitUpdate("execution_pending", {
        message: "Waiting for WebSocket connection...",
        timeout,
      });

      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        const connectionId = await mongoService.getConnectionId(executionId);
        if (connectionId) {
          logger.info(`WebSocket connection established for ${executionId}.`);
          return true; // Connection found
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
      }

      logger.error(
        `Timed out waiting for WebSocket connection for ${executionId}.`
      );
      return false; // Timed out
    };

    const isConnected = await waitForConnection();
    if (!isConnected) {
      throw new Error(
        `Client failed to connect to WebSocket within the 15-second timeout period.`
      );
    }

    logger.info("Connection confirmed, starting workflow execution...");
    await emitUpdate("execution_started", {
      workflow: executionData.workflowId,
      startedAt: executionData.startedAt,
    });

    // --- Prepare workflow graph for execution ---
    const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));
    const edgeMap = new Map();
    const reverseEdgeMap = new Map();
    const edgeIdMap = new Map();

    for (const edge of workflow.edges) {
      if (!edgeMap.has(edge.source)) edgeMap.set(edge.source, []);
      edgeMap.get(edge.source).push(edge.target);
      if (!reverseEdgeMap.has(edge.target)) reverseEdgeMap.set(edge.target, []);
      reverseEdgeMap.get(edge.target).push(edge.source);
      edgeIdMap.set(edge.id, edge);
    }

    const entryNodeId = workflow.nodes.find(
      (n) => !reverseEdgeMap.has(n.id) || reverseEdgeMap.get(n.id).length === 0
    )?.id;
    if (!entryNodeId) {
      throw new Error("No entry node found in the workflow.");
    }

    let currentNodeId = entryNodeId;
    let context = { ...initialInput }; // Start with the initial input

    // --- Main Execution Loop ---
    while (currentNodeId) {
      const node = nodeMap.get(currentNodeId);
      const nodeStartTime = new Date();

      executionData.nodes[node.id] = {
        id: node.id,
        type: node.type,
        status: "running",
        startedAt: nodeStartTime,
      };
      await emitUpdate("node_started", {
        nodeId: node.id,
        nodeType: node.type,
        timestamp: nodeStartTime,
      });

      try {
        const handler = nodeProcessor.getHandler(node.type);
        if (!handler) {
          throw {
            type: ErrorTypes.EXECUTION_FAILED,
            message: `No handler for node type ${node.type}`,
          };
        }

        // Execute the node handler
        context = await handler(
          node,
          context,
          requestContext,
          executionData.context
        );
        executionData.context[node.id] = { result: context };

        // --- Branching and Next Node Logic ---
        if (node.type === "condition" || node.type === "loop") {
          const nextEdgeId = context.nextEdgeId;
          const nextEdge = edgeIdMap.get(nextEdgeId);
          if (!nextEdge)
            throw new Error(`No edge found with ID: ${nextEdgeId}`);
          currentNodeId = nextEdge.target;
        } else {
          const nextTargets = edgeMap.get(currentNodeId);
          currentNodeId = nextTargets?.[0] || null;
        }

        // --- Node Completion ---
        const nodeEndTime = new Date();
        const duration = nodeEndTime - nodeStartTime;
        executionData.nodes[node.id] = {
          ...executionData.nodes[node.id],
          status: "completed",
          completedAt: nodeEndTime,
          duration,
          output: context,
        };
        await emitUpdate("node_completed", {
          nodeId: node.id,
          nodeType: node.type,
          output: context,
          timestamp: nodeEndTime,
          duration,
        });
      } catch (error) {
        error.nodeId = node.id;
        error.nodeType = node.type;
        throw error; // Propagate to the main catch block
      }
    }

    // --- Workflow Completion ---
    executionData.status = "completed";
    executionData.completedAt = new Date();
    executionData.output = context;
    executionData.duration =
      executionData.completedAt - executionData.startedAt;
    await emitUpdate("execution_completed", {
      output: context,
      timestamp: executionData.completedAt,
      duration: executionData.duration,
    });

    logger.info(
      `Workflow completed successfully for executionId: ${executionId}`
    );
  } catch (error) {
    logger.error(`Workflow failed for executionId ${executionId}:`, error);

    if (executionData && executionId) {
      const nodeStartTime = error.nodeId
        ? executionData.nodes[error.nodeId]?.startedAt
        : executionData.startedAt;
      const duration = new Date() - nodeStartTime;

      if (error.nodeId && emitUpdate) {
        executionData.nodes[error.nodeId] = {
          ...executionData.nodes[error.nodeId],
          status: "failed",
          completedAt: new Date(),
          duration,
          error: { message: error.message, type: error.type },
        };

        try {
          await emitUpdate("node_failed", {
            nodeId: error.nodeId,
            nodeType: error.nodeType,
            error: { message: error.message, type: error.type },
            timestamp: new Date(),
            duration,
          });
        } catch (emitError) {
          logger.error("Failed to emit node_failed event:", emitError);
        }
      }

      executionData.status = "failed";
      executionData.error = {
        message: error.message,
        type: error.type,
        nodeId: error.nodeId,
        nodeType: error.nodeType,
      };

      if (emitUpdate) {
        try {
          await emitUpdate("execution_failed", {
            error: executionData.error,
            timestamp: new Date(),
          });
        } catch (emitError) {
          logger.error("Failed to emit execution_failed event:", emitError);
        }
      }
    } else {
      logger.error("Orchestrator initialization failed:", error);
    }

    throw error;
  } finally {
    // Fixed: Use the executionId variable that's properly scoped
    if (executionId && mongoService) {
      try {
        await mongoService.deleteExecution(executionId);
        logger.info(`Successfully cleaned up execution: ${executionId}`);
      } catch (deleteError) {
        logger.error("Failed to delete execution:", deleteError);
      }
      logger.info(`Orchestrator finished for executionId: ${executionId}`);
    }
  }
};
