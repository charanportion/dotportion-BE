import { NodeVM } from "vm2";
import { ErrorTypes } from "../utils/errors.js";
import replaceDynamicValues from "../utils/replaceDynamicValues.js";
import { MongoClient } from "mongodb";
import jwt from "jsonwebtoken";
import { PlatformDatabaseHandler } from "../utils/PlatformDatabaseHandler.js";

export class WorkflowExecutor {
  constructor(secretService) {
    this.secretService = secretService;
    this.nodeRegistry = new Map();
  }

  registerNodeHandler(type, node) {
    this.nodeRegistry.set(type, node);
  }

  async execute(workflow, req, logId) {
    const executionId = `exec_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    console.log(
      `[${executionId}] Starting workflow execution for workflow: ${workflow._id}, logId: ${logId}`
    );

    const nodeMap = new Map(workflow.nodes.map((node) => [node.id, node]));
    const edgeMap = new Map(); // source -> list of target nodes
    const reverseEdgeMap = new Map(); // target -> list of sources (for finding start)
    const edgeIdMap = new Map(); // edge id -> edge object

    console.log(`[${executionId}] Workflow structure:`, {
      nodeCount: workflow.nodes.length,
      edgeCount: workflow.edges.length,
      nodeTypes: [...new Set(workflow.nodes.map((n) => n.type))],
    });

    // console.log("Workflow edges:", workflow.edges);

    for (const edge of workflow.edges) {
      if (!edgeMap.has(edge.source)) edgeMap.set(edge.source, []);
      edgeMap.get(edge.source).push(edge.target);

      if (!reverseEdgeMap.has(edge.target)) reverseEdgeMap.set(edge.target, []);
      reverseEdgeMap.get(edge.target).push(edge.source);

      // Store edge by ID
      edgeIdMap.set(edge.id, edge);
      // console.log(`Stored edge ${edge.id}:`, edge);
    }

    console.log(`[${executionId}] Edge maps built:`, {
      edgeMapSize: edgeMap.size,
      reverseEdgeMapSize: reverseEdgeMap.size,
      edgeIdMapSize: edgeIdMap.size,
    });

    // Find the entry node: node with no incoming edges
    const entryNodeId = workflow.nodes.find(
      (node) => !reverseEdgeMap.has(node.id)
    )?.id;

    if (!entryNodeId) {
      console.error(
        `[${executionId}] No entry node found (node with no incoming edges)`
      );
      throw { message: "No entry node found (node with no incoming edges)." };
    }

    console.log(`[${executionId}] Entry node found: ${entryNodeId}`);

    let currentNodeId = entryNodeId;
    let input = {};
    const context = {};
    let nodeCount = 0;

    while (currentNodeId) {
      nodeCount++;
      console.log(
        `[${executionId}] Executing node ${nodeCount}: ${currentNodeId}`
      );

      const currentNode = nodeMap.get(currentNodeId);
      console.log(`[${executionId}] Current node details:`, {
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        hasData: !!currentNode.data,
      });

      // console.log("Current Node:", currentNode);
      const handler = this.nodeRegistry.get(currentNode.type);

      if (!handler) {
        console.error(
          `[${executionId}] No handler found for node type: ${currentNode.type}`
        );
        throw {
          type: ErrorTypes.EXECUTION_FAILED,
          message: `No handler for node type ${currentNode.type}`,
        };
      }

      console.log(
        `[${executionId}] Handler found for node type: ${currentNode.type}`
      );

      try {
        console.log(`[${executionId}] Executing node handler with input:`, {
          inputKeys: Object.keys(input),
          contextKeys: Object.keys(context),
          hasReq: !!req,
        });

        const nodeStartTime = Date.now();
        const startedAt = new Date().toISOString();
        const nodeInput = input; // Capture the input before node execution
        input = await handler.call(
          this,
          currentNode,
          input,
          req,
          context,
          workflow
        );
        const nodeDurationMs = Date.now() - nodeStartTime;
        const finishedAt = new Date().toISOString();

        context[currentNodeId] = { result: input };
        console.log(`[${executionId}] Node execution completed:`, {
          nodeId: currentNodeId,
          nodeType: currentNode.type,
          hasResult: !!input,
          resultType: typeof input,
          durationMs: nodeDurationMs,
        });

        // Add step to execution log
        if (logId) {
          try {
            this.addStepToLog(logId, {
              nodeId: currentNodeId,
              nodeType: currentNode.type,
              nodeName: currentNode.name || currentNode.type,
              status: "success",
              startedAt,
              finishedAt,
              durationMs: nodeDurationMs,
              input: nodeInput, // Use the input that was passed to this node
              output: { result: input }, // Use the result after node execution
            });
          } catch (logError) {
            console.error(
              `[${executionId}] Failed to add step to log:`,
              logError
            );
            // Don't fail execution if logging fails
          }
        }

        // console.log("Node execution result:", input);

        if (currentNode.type === "jwtVerify" && !input.isAuthenticated) {
          console.error(
            `[${executionId}] JWT verification failed - access denied`
          );
          throw {
            type: ErrorTypes.EXECUTION_FAILED,
            message: "Access Denied",
          };
        }

        // Handle branching for condition and loop nodes
        if (currentNode.type === "condition" || currentNode.type === "loop") {
          console.log(
            `[${executionId}] Processing ${currentNode.type} node result:`,
            input
          );
          // console.log("Processing condition node result:", input);
          const nextEdgeId = input.nextEdgeId;
          console.log(`[${executionId}] Looking for edge: ${nextEdgeId}`);
          // console.log("Looking for edge:", nextEdgeId);
          const nextEdge = edgeIdMap.get(nextEdgeId);

          if (!nextEdge) {
            console.error(
              `[${executionId}] No edge found with ID: ${nextEdgeId}`
            );
            throw {
              type: ErrorTypes.EXECUTION_FAILED,
              message: `No edge found with ID: ${nextEdgeId}. Available edges: ${Array.from(
                edgeIdMap.keys()
              ).join(", ")}`,
            };
          }

          console.log(`[${executionId}] Found next edge:`, {
            edgeId: nextEdge.id,
            source: nextEdge.source,
            target: nextEdge.target,
          });
          // console.log("Found next edge:", nextEdge);
          currentNodeId = nextEdge.target;
        } else {
          const nextTargets = edgeMap.get(currentNodeId);
          console.log(
            `[${executionId}] Next targets for node ${currentNodeId}:`,
            nextTargets
          );
          currentNodeId = nextTargets?.[0] || null; // move to next connected node
          console.log(`[${executionId}] Moving to next node: ${currentNodeId}`);
        }
      } catch (err) {
        console.error(`[${executionId}] Node execution error:`, {
          nodeId: currentNodeId,
          nodeType: currentNode.type,
          error: err.message,
          stack: err.stack,
        });

        // Add error step to execution log
        if (logId) {
          try {
            const errorTimestamp = new Date().toISOString();
            this.addStepToLog(logId, {
              nodeId: currentNodeId,
              nodeType: currentNode.type,
              nodeName: currentNode.name || currentNode.type,
              status: "error",
              startedAt: errorTimestamp,
              finishedAt: errorTimestamp,
              durationMs: 0,
              error: err.message,
            });
          } catch (logError) {
            console.error(
              `[${executionId}] Failed to add error step to log:`,
              logError
            );
            // Don't fail execution if logging fails
          }
        }

        err.nodeId = currentNodeId;
        err.nodeType = currentNode.type;
        throw err;
      }
    }

    console.log(
      `[${executionId}] Workflow execution completed. Total nodes executed: ${nodeCount}`
    );

    // Ensure we have a status code in the response
    if (input && typeof input === "object") {
      const finalResult = {
        status: input.status || 200,
        data: input.data || input,
        token: input.token,
      };

      console.log(`[${executionId}] Final result:`, {
        status: finalResult.status,
        hasData: !!finalResult.data,
        hasToken: !!finalResult.token,
      });

      return finalResult;
    }

    const defaultResult = {
      status: 200,
      data: input,
    };

    console.log(`[${executionId}] Default result:`, {
      status: defaultResult.status,
      hasData: !!defaultResult.data,
    });

    return defaultResult;
  }

  async handleApiStartNode(node, _, req, context) {
    return await this.processApiStartNode(node, req, context);
  }

  async handleParametersNode(node, _, req, context) {
    return await this.processParametersNode(node, req, context);
  }

  async handleLogicNode(node, input, req, context) {
    return await this.processLogicNode(node, input, req, context);
  }

  async handleMongoDBNode(node, input, req, context, workflow) {
    return await this.processMongoDBNode(node, input, req, context, workflow);
  }

  async handleDatabaseNode(node, input, req, context, workflow) {
    return await this.processDatabaseNode(node, input, req, context, workflow);
  }

  async handleJWTGenerateNode(node, input, req, context, workflow) {
    return await this.processJWTGenerateNode(
      node,
      input,
      req,
      context,
      workflow
    );
  }

  async handleJWTVerifyNode(node, input, req, context, workflow) {
    return await this.processJWTVerifyNode(node, input, req, context, workflow);
  }

  handleResponseNode(node, output, req, context) {
    return this.processResponseNode(node, output, context);
  }

  async handleConditionNode(node, input, req, context) {
    return await this.processConditionNode(node, input, req, context);
  }

  async handleLoopNode(node, input, req, context) {
    return await this.processLoopNode(node, input, req, context);
  }

  initialize() {
    this.registerNodeHandler("apiStart", this.handleApiStartNode.bind(this));
    this.registerNodeHandler(
      "parameters",
      this.handleParametersNode.bind(this)
    );
    this.registerNodeHandler("logic", this.handleLogicNode.bind(this));
    this.registerNodeHandler("mongodb", this.handleMongoDBNode.bind(this));
    this.registerNodeHandler("database", this.handleDatabaseNode.bind(this));
    this.registerNodeHandler("response", this.handleResponseNode.bind(this));
    this.registerNodeHandler(
      "jwtGenerate",
      this.handleJWTGenerateNode.bind(this)
    );
    this.registerNodeHandler("jwtVerify", this.handleJWTVerifyNode.bind(this));
    this.registerNodeHandler("condition", this.handleConditionNode.bind(this));
    this.registerNodeHandler("loop", this.handleLoopNode.bind(this));
  }

  async processApiStartNode(node, req, context) {
    return node.data;
  }

  async processParametersNode(node, req, context) {
    const { sources = [], options = {} } = node.data;
    const {
      strictMode = false,
      caseSensitive = false,
      mergePriority = ["params", "body", "query", "headers"],
    } = options;

    const mergedInput = {};
    const allErrors = [];
    const allCollectedParams = new Set();

    // Process each source in specified priority order
    for (const sourceConfig of mergePriority
      .map((src) => sources.find((s) => s.from === src))
      .filter(Boolean)) {
      const {
        from,
        required = [],
        validation = {},
        mapping = {},
      } = sourceConfig;
      let sourceInput;

      // Get input from different sources
      switch (from) {
        case "params":
          sourceInput = req.params;
          break;
        case "body":
          sourceInput = req.body;
          break;
        case "query":
          sourceInput = req.query;
          break;
        case "headers":
          sourceInput = caseSensitive
            ? req.headers
            : Object.fromEntries(
                Object.entries(req.headers).map(([k, v]) => [
                  k.toLowerCase(),
                  v,
                ])
              );
          break;
        default:
          throw new Error(`Invalid source: ${from}`);
      }

      // Process parameter mapping
      const processedInput = {};

      const allowedKeys = new Set([
        ...required,
        ...Object.keys(validation),
        ...Object.keys(mapping),
      ]);

      for (const key of allowedKeys) {
        const sourceKey = mapping[key] || key;
        if (sourceInput && sourceKey in sourceInput) {
          processedInput[key] = sourceInput[sourceKey];
          allCollectedParams.add(key);
        }
      }

      // Check required parameters
      const missingParams = required.filter((param) => {
        const sourceParam = mapping[param] || param;
        return !(sourceParam in (sourceInput || {}));
      });

      if (missingParams.length > 0) {
        allErrors.push({
          source: from,
          type: "MISSING_PARAMS",
          params: missingParams,
          message: `Missing in ${from}: ${missingParams.join(", ")}`,
        });
      }

      // Validate parameters
      const validationErrors = [];
      Object.entries(validation).forEach(([param, rules]) => {
        const sourceParam = mapping[param] || param;
        const value = processedInput[param];

        if (value === undefined) return;

        if (rules.regex && !new RegExp(rules.regex).test(value)) {
          validationErrors.push({
            param,
            value,
            rule: "regex",
            message: rules.message || `${param} failed format validation`,
          });
        }

        if (typeof rules.min === "number" && Number(value) < rules.min) {
          validationErrors.push({
            param,
            value,
            rule: "min",
            message: `${param} must be ≥ ${rules.min}`,
          });
        }

        if (typeof rules.max === "number" && Number(value) > rules.max) {
          validationErrors.push({
            param,
            value,
            rule: "max",
            message: `${param} must be ≤ ${rules.max}`,
          });
        }

        if (
          rules.enum &&
          Array.isArray(rules.enum) &&
          !rules.enum.includes(value)
        ) {
          validationErrors.push({
            param,
            value,
            rule: "enum",
            message: `${param} must be one of: ${rules.enum.join(", ")}`,
          });
        }
      });

      if (validationErrors.length > 0) {
        allErrors.push({
          source: from,
          type: "VALIDATION_FAILED",
          errors: validationErrors,
        });
      }

      // Merge with priority
      Object.assign(mergedInput, processedInput);
    }

    // Strict mode validation
    if (strictMode) {
      const allowedParams = new Set();
      sources.forEach((src) => {
        [
          ...(src.required || []),
          ...Object.keys(src.validation || {}),
          ...Object.values(src.mapping || {}),
        ]
          .filter(Boolean)
          .forEach((p) => allowedParams.add(p));
      });

      const unexpectedParams = [...allCollectedParams].filter(
        (p) => !allowedParams.has(p)
      );
      if (unexpectedParams.length > 0) {
        allErrors.push({
          type: "UNEXPECTED_PARAMS",
          params: unexpectedParams,
          message: `Unexpected parameters: ${unexpectedParams.join(", ")}`,
        });
      }
    }

    if (allErrors.length > 0) {
      throw {
        type: ErrorTypes.PARAMETER_PROCESSING_FAILED,
        message: "Parameter validation failed",
        details: allErrors,
        receivedParams: Object.keys(mergedInput),
      };
    }
    return mergedInput;
  }

  async processLogicNode(node, input, req, context) {
    const vm = new NodeVM({
      console: "inherit",
      sandbox: {
        fetch: async (url, options) => {
          const res = await fetch(url, options);
          const safeRes = {
            status: res.status,
            ok: res.ok,
            json: async () => await res.json(),
            text: async () => await res.text(),
          };
          return safeRes;
        },
      },
      timeout: 2000,
      eval: false,
      wasm: false,
      //   require: false,
    });
    // console.log("logic context", context["param-1"]);

    try {
      // Wrap the code in a function and properly handle async execution
      const wrappedCode = `
        module.exports = async (input,context) => { 
          try {
            ${node.data.code}
          } catch (err) {
            throw err;
          }
        }
      `;

      const func = vm.run(wrappedCode);
      const result = await func(input, context);

      // Handle undefined results
      return result !== undefined ? result : input;
    } catch (err) {
      console.log("err", err);
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: err.message || "Error executing logic node",
        originalError: err.toString(),
      };
    }
  }

  async processMongoDBNode(
    node,
    input,
    req,
    context,
    workflow,
    isRealTime = false
  ) {
    const { tenant } = req.params;
    const {
      collection,
      provider,
      operation,
      data = {},
      query = {},
      options = {},
    } = node.data;
    if (!collection || !operation) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: "Missing collection or operation",
      };
    }

    // console.log("tenent", tenant);
    // console.log("provider", provider);
    if (!tenant) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: "Missing tenant in node or input",
      };
    }
    let projectId;
    if (isRealTime) {
      projectId = req.params.projectId;
    } else {
      projectId = workflow.project;
    }

    const secret = await this.secretService.getSecretByProvider(
      tenant,
      projectId,
      provider
    );
    if (!secret) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: "Missing secret in node or input",
      };
    }

    const uri = secret.data.uri;
    const dbName = secret.tenant;

    if (!uri || !dbName) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: `Missing 'uri' or 'db' in MongoDB secret data`,
      };
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    const col = db.collection(collection);

    const resolvedFilter = replaceDynamicValues(query, input, context);
    // console.log("resolvedFilter", resolvedFilter);

    const resolvedData = replaceDynamicValues(data, input, context);

    // console.log(`[Database Node Debug] Operation: ${operation}`);
    // console.log(
    //   "[Database Node Debug] Resolved Filter:",
    //   JSON.stringify(resolvedFilter, null, 2)
    // );
    // console.log(
    //   "[Database Node Debug] Resolved Data:",
    //   JSON.stringify(resolvedData, null, 2)
    // );
    // console.log("[Database Node Debug] Collection:", collection);
    try {
      let result;

      switch (operation) {
        case "findOne":
          result = await col.findOne(resolvedFilter, options);
          break;
        case "findMany":
          result = await col.find(resolvedFilter, options).toArray();
          break;
        case "insertOne":
          result = await col.insertOne(resolvedData);
          break;
        case "insertMany":
          result = await col.insertMany(resolvedData);
          break;
        case "updateOne":
          result = await col.updateOne(
            resolvedFilter,
            { $set: resolvedData },
            options
          );
          break;
        case "updateMany":
          result = await col.updateMany(
            resolvedFilter,
            { $set: resolvedData },
            options
          );
          break;
        case "deleteOne":
          result = await col.deleteOne(resolvedFilter, options);
          break;
        case "deleteMany":
          result = await col.deleteMany(resolvedFilter, options);
          break;
        default:
          throw {
            type: ErrorTypes.EXECUTION_FAILED,
            message: `Unsupported DB operation: ${operation}`,
          };
      }

      // console.log(
      //   "[Database Node Debug] Operation Result:",
      //   JSON.stringify(result, null, 2)
      // );

      return result;
    } catch (err) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: err.message || "MongoDB operation failed",
        originalError: err.toString(),
      };
    } finally {
      await client.close();
    }
  }

  async processDatabaseNode(
    node,
    input,
    req,
    context,
    workflow,
    isRealTime = false
  ) {
    const { tenant } = req.params;
    const {
      collection,
      operation,
      data = {},
      query = {},
      options = {},
    } = node.data;

    if (!collection || !operation) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: "Missing collection or operation",
      };
    }

    if (!tenant) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: "Missing tenant in node or input",
      };
    }

    // Use platform MongoDB connection with schema management
    const platformUri = process.env.MONGO_URI;
    if (!platformUri) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: "Platform MongoDB URI not configured",
      };
    }

    const dbHandler = new PlatformDatabaseHandler(platformUri);

    try {
      await dbHandler.connect(tenant);

      // Ensure collection exists (will auto-create test or check schema for others)
      await dbHandler.ensureCollectionExists(collection, tenant);

      const resolvedFilter = replaceDynamicValues(query, input, context);
      const resolvedData = replaceDynamicValues(data, input, context);

      // Execute operation with schema validation
      const result = await dbHandler.executeOperation(
        operation,
        collection,
        resolvedFilter,
        resolvedData,
        options
      );

      return result;
    } catch (err) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: err.message || "Platform database operation failed",
        originalError: err.toString(),
      };
    } finally {
      await dbHandler.close();
    }
  }

  async processJWTGenerateNode(
    node,
    input,
    req,
    context,
    workflow,
    isRealTime = false
  ) {
    const { tenant } = req.params;
    const { payload, type = "jwt", expiresIn = "1h" } = node.data;

    if (!tenant) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: "Missing tenant in node or input",
      };
    }
    if (!payload || !type) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: "Missing payload or type in node or input",
      };
    }
    let projectId;
    if (isRealTime) {
      projectId = req.params.projectId;
    } else {
      projectId = workflow.project;
    }

    const secret = await this.secretService.getSecretByProvider(
      tenant,
      projectId,
      type
    );

    const jwtSecret = secret.data.secret;
    if (!jwtSecret) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: "Missing jwt secret in node or input",
      };
    }

    const resolvedPayload = replaceDynamicValues(payload, input, context);

    const token = jwt.sign(resolvedPayload, jwtSecret, { expiresIn });
    return { token: `Bearer ${token}` };
  }

  async processJWTVerifyNode(
    node,
    input,
    req,
    context,
    workflow,
    isRealTime = false
  ) {
    const { tenant } = req.params;
    const { type = "jwt" } = node.data;
    const firstNodeId = Object.keys(context)[1];
    let token = context[firstNodeId].result.authorization;
    if (!token) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: "Access Denied",
      };
    }

    if (!tenant) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: "Missing tenant in node or input",
      };
    }
    let projectId;
    if (isRealTime) {
      projectId = req.params.projectId;
    } else {
      projectId = workflow.project;
    }

    const secret = await this.secretService.getSecretByProvider(
      tenant,
      projectId,
      type
    );
    const jwtSecret = secret.data.secret;
    if (!jwtSecret) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: "Missing jwt secret in node or input",
      };
    }

    if (token.startsWith("Bearer ")) {
      token = token.slice(7, token.length).trimLeft();
    }

    const decoded = jwt.verify(token, jwtSecret);
    // console.log("decoded", decoded);
    return { isAuthenticated: true, data: decoded };
  }

  async processConditionNode(node, input, req, context) {
    // console.log("Condition Node Data:", node.data);
    // console.log("Input:", input);
    // console.log("Context:", context);

    const { condition, trueEdgeId, falseEdgeId } = node.data;

    if (!condition) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: "Missing condition in condition node",
      };
    }

    if (!trueEdgeId || !falseEdgeId) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: `Missing edge IDs in condition node. trueEdgeId: ${trueEdgeId}, falseEdgeId: ${falseEdgeId}`,
      };
    }

    // Replace dynamic values in the condition
    const resolvedCondition = replaceDynamicValues(condition, input, context);
    // console.log("Resolved Condition:", resolvedCondition);

    // Create a safe evaluation context
    const vm = new NodeVM({
      console: "inherit",
      timeout: 1000,
      eval: false,
      wasm: false,
    });

    try {
      // First, replace the template syntax with actual values
      let processedCondition = condition;
      if (typeof condition === "string") {
        // Replace {{input.x}} with input.x
        processedCondition = condition.replace(
          /{{([^}]+)}}/g,
          (match, path) => {
            const keys = path.trim().split(".");
            let value = keys[0] === "input" ? input : context[keys[0]];
            for (let i = 1; i < keys.length; i++) {
              if (value && typeof value === "object") {
                value = value[keys[i]];
              } else {
                return "undefined";
              }
            }
            return JSON.stringify(value);
          }
        );
      }

      // console.log("Processed Condition:", processedCondition);

      // Wrap the condition in a function for safe evaluation
      const wrappedCode = `
        module.exports = function(input) {
          // console.log("Evaluating condition with input:", input);
          try {
            const result = ${processedCondition};
            // console.log("Condition result:", result);
            return Boolean(result);
          } catch (err) {
            console.error("Error evaluating condition:", err);
            throw err;
          }
        }
      `;

      const func = vm.run(wrappedCode);
      const result = func(input);
      // console.log("Final condition result:", result);

      // Return the condition result and the edge ID to follow
      const nextEdgeId = result ? trueEdgeId : falseEdgeId;
      // console.log("Selected edge ID:", nextEdgeId);

      return {
        conditionResult: result,
        nextEdgeId: nextEdgeId,
      };
    } catch (err) {
      console.error("Error in condition evaluation:", err);
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: "Error evaluating condition",
        originalError: err.toString(),
        details: {
          originalCondition: condition,
          processedCondition: processedCondition,
          trueEdgeId,
          falseEdgeId,
          input,
        },
      };
    }
  }

  processResponseNode(node, output, context) {
    const { status = 200 } = node.data || {};

    const token = context["jwtGenerate"];

    if (token) {
      return {
        status,
        token: token,
        data: output,
      };
    }

    return {
      status,
      data: output,
    };
  }

  async processLoopNode(node, input, req, context) {
    const { items, trueEdgeId, falseEdgeId } = node.data;

    if (!items) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: "Missing items in loop node",
      };
    }

    if (!trueEdgeId || !falseEdgeId) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: `Missing edge IDs in loop node. trueEdgeId: ${trueEdgeId}, falseEdgeId: ${falseEdgeId}`,
      };
    }

    // Replace dynamic values in the items
    console.log("loop node");
    console.log("items", items);
    const resolvedItems = replaceDynamicValues(items, input, context);
    console.log("Loop node resolved items:", resolvedItems);

    // Ensure items is an array
    const itemsArray = Array.isArray(resolvedItems)
      ? resolvedItems
      : [resolvedItems];
    // console.log("Items array:", itemsArray);

    // Store the current iteration index in context
    const loopContext = context.loop || {};
    const currentIndex = loopContext.currentIndex || 0;

    // Check if we have more items to process
    const hasMoreItems = currentIndex < itemsArray.length;

    // Get the current item
    const currentItem = itemsArray[currentIndex];
    // console.log("Current item:", currentItem);

    // Update the loop context
    context.loop = {
      ...loopContext,
      currentIndex: currentIndex + 1,
      totalItems: itemsArray.length,
      currentItem,
      isLast: currentIndex === itemsArray.length - 1,
    };

    // console.log("Loop context updated:", context.loop);

    // Return the condition result and the edge ID to follow
    return {
      hasMoreItems,
      nextEdgeId: hasMoreItems ? trueEdgeId : falseEdgeId,
      currentItem,
      loopContext: context.loop,
    };
  }

  async addStepToLog(logId, stepData) {
    try {
      // Import StatsUpdater dynamically to avoid circular dependencies
      const { StatsUpdater } = await import("../StatsUpdater.js");
      const statsUpdater = new StatsUpdater();

      await statsUpdater.addStep({
        logId,
        stepData,
      });
    } catch (error) {
      console.error("Error adding step to log:", error);
      // Don't throw error to avoid breaking workflow execution
    }
  }
}
