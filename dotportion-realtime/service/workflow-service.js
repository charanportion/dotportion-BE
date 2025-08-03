// src/services/WorkflowService.js

import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import logger from "/opt/nodejs/utils/logger.js";
import { RealtimeWorkflowExecutor } from "../utils/RealtimeWorkflowExecutor.js";

export class WorkflowService {
  #sfnClient;
  #webSocketService;
  #dbService;

  constructor(webSocketService, dbService) {
    this.#sfnClient = new SFNClient({
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
    });
    this.#webSocketService = webSocketService;
    this.#dbService = dbService;
    logger.info("WorkflowService initialized");
  }

  /**
   * Starts the Step Functions state machine execution.
   * @param {string} executionId - The unique ID for this execution.
   * @param {object} workflow - The workflow definition object.
   * @param {object} input - The initial input for the workflow.
   * @param {object} pathParameters - Original path parameters.
   */
  async startWorkflow(executionId, workflow, input, pathParameters) {
    logger.info(`Starting Step Function execution for ${executionId}`);

    const stateMachineArn = process.env.STATE_MACHINE_ARN;
    const params = {
      stateMachineArn,
      name: executionId, // Use executionId for traceability
      input: JSON.stringify({
        executionId,
        workflow,
        context: {
          ...input, // Start with the initial input
          request: { pathParameters }, // Pass original request context if needed
        },
      }),
    };

    try {
      await this.#sfnClient.send(new StartExecutionCommand(params));
      logger.info(
        `Successfully started state machine for executionId: ${executionId}`
      );
    } catch (error) {
      logger.error("Error starting Step Function execution:", error);
      throw new Error("Failed to start workflow execution.");
    }
  }

  /**
   * Processes a single node from the workflow. This function is called by a Step Function task.
   * @param {object} event - The event payload from the Step Function.
   * @returns {object} The result to be passed to the next state.
   */
  async processNode(event) {
    const { executionId, workflow, context, taskToken } = event;
    const executor = new RealtimeWorkflowExecutor(
      this.#webSocketService,
      executionId
    );

    // Find the current node to process based on state machine logic
    // This is a simplified representation. A real implementation would need to
    // determine the current node based on the state machine's current state name.
    const currentNode = workflow.nodes.find((n) => n.type === "parameters"); // Example

    logger.info(
      `Processing node ${currentNode.id} (${currentNode.type}) for execution ${executionId}`
    );

    try {
      // Emit node_started event
      await executor.emitUpdate("node_started", {
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        timestamp: new Date().toISOString(),
      });

      // The core logic for the node handler would go here.
      // This is where you would adapt the logic from your original `RealtimeWorkflowExecutor`.
      const output = await executor.handleParametersNode(
        currentNode,
        context.input,
        context.request,
        context
      );

      // Emit node_completed event
      await executor.emitUpdate("node_completed", {
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        output,
        timestamp: new Date().toISOString(),
      });

      // This is a simplified next step determination.
      // In the real Step Function, the 'Choice' state would handle this.
      const nextNode = workflow.nodes[1]; // Placeholder for next node logic

      return {
        ...event,
        context: { ...context, [currentNode.id]: { result: output } },
        nextNode,
      };
    } catch (error) {
      logger.error(
        `Node ${currentNode.id} failed for execution ${executionId}:`,
        error
      );
      await executor.emitUpdate("node_failed", {
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        error: { message: error.message, type: error.type },
        timestamp: new Date().toISOString(),
      });
      // You would use SendTaskFailure here with the taskToken
      throw error; // This will fail the Step Function task
    }
  }
}
