import { ErrorTypes } from "./errors.js";
import logger from "/opt/nodejs/utils/logger.js";
import { NodeVM } from "vm2";
import replaceDynamicValues from "./replaceDynamicValues.js";
import { MongoClient } from "mongodb";
import jwt from "jsonwebtoken";
import { PlatformDatabaseHandler } from "./PlatformDatabaseHandler.js";

export class NodeProcessor {
  #nodeRegistry;
  #secretService;

  constructor(secretService) {
    this.#nodeRegistry = new Map();
    this.#secretService = secretService;
    this.initializeNodeHandlers();
  }

  initializeNodeHandlers() {
    this.registerNodeHandler("apiStart", this.processApiStartNode.bind(this));
    this.registerNodeHandler(
      "parameters",
      this.processParametersNode.bind(this)
    );
    this.registerNodeHandler("logic", this.processLogicNode.bind(this));
    this.registerNodeHandler("mongodb", this.processMongoDBNode.bind(this));
    this.registerNodeHandler("database", this.processDatabaseNode.bind(this));
    this.registerNodeHandler("response", this.processResponseNode.bind(this));
    this.registerNodeHandler(
      "jwtGenerate",
      this.processJWTGenerateNode.bind(this)
    );
    this.registerNodeHandler("jwtVerify", this.processJWTVerifyNode.bind(this));
    this.registerNodeHandler("condition", this.processConditionNode.bind(this));
    this.registerNodeHandler("loop", this.processLoopNode.bind(this));
  }

  registerNodeHandler(type, handler) {
    this.#nodeRegistry.set(type, handler);
  }

  getHandler(type) {
    return this.#nodeRegistry.get(type);
  }

  // --- Node Handler Implementations ---

  async processApiStartNode(node, context, requestContext, executionContext) {
    logger.info(`Processing apiStart node: ${node.id}`);
    // In the serverless model, the initial input is already passed into the context.
    // This node might be used to merge path parameters or other request-specific data.
    return { ...context, ...node.data };
  }

  async processParametersNode(node, context, requestContext, executionContext) {
    logger.info(`Processing parameters node: ${node.id}`);
    const { sources = [], options = {} } = node.data;
    const {
      strictMode = false,
      caseSensitive = false,
      mergePriority = ["params", "body", "query", "headers"],
    } = options;

    logger.info(`Node data: ${JSON.stringify(node.data)}`);
    logger.info(
      `Options: strictMode=${strictMode}, caseSensitive=${caseSensitive}, mergePriority=${JSON.stringify(
        mergePriority
      )}`
    );

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

      logger.info(`Processing source: ${from}`);
      logger.info(
        `Source config: required=${JSON.stringify(
          required
        )}, validation=${JSON.stringify(validation)}, mapping=${JSON.stringify(
          mapping
        )}`
      );

      const { input } = requestContext.body;
      const sourceInput = input;
      logger.info(`Source input: ${JSON.stringify(sourceInput)}`);

      const missingParams = required.filter((param) => {
        const sourceParam = mapping[param] || param;
        const hasParam = sourceParam in (sourceInput || {});
        logger.info(
          `Checking param: ${param} (source: ${sourceParam}) - exists: ${hasParam}`
        );
        return !hasParam;
      });

      if (missingParams.length > 0) {
        logger.warn(
          `Missing parameters in source ${from}: ${JSON.stringify(
            missingParams
          )}`
        );
        allErrors.push({
          source: from,
          type: "MISSING_PARAMS",
          params: missingParams,
          message: `Missing in body: ${missingParams.join(", ")}`,
        });
      }

      // Process parameter mapping
      const processedInput = {};

      const allowedKeys = new Set([
        ...required,
        ...Object.keys(validation),
        ...Object.keys(mapping),
      ]);

      logger.info(
        `Allowed keys for source ${from}: ${JSON.stringify([...allowedKeys])}`
      );

      for (const key of allowedKeys) {
        const sourceKey = mapping[key] || key;
        if (sourceInput && sourceKey in sourceInput) {
          processedInput[key] = sourceInput[sourceKey];
          allCollectedParams.add(key);
          logger.info(
            `Mapped parameter: ${key} <- ${sourceKey} = ${JSON.stringify(
              sourceInput[sourceKey]
            )}`
          );
        } else {
          logger.info(`Parameter not found: ${key} (source: ${sourceKey})`);
        }
      }

      logger.info(
        `Processed input for source ${from}: ${JSON.stringify(processedInput)}`
      );

      // Validate parameters
      const validationErrors = [];
      Object.entries(validation).forEach(([param, rules]) => {
        const sourceParam = mapping[param] || param;
        const value = processedInput[param];

        logger.info(
          `Validating param: ${param} (source: ${sourceParam}) = ${JSON.stringify(
            value
          )}`
        );
        logger.info(`Validation rules: ${JSON.stringify(rules)}`);

        if (value === undefined) {
          logger.info(`Skipping validation for undefined param: ${param}`);
          return;
        }

        if (rules.regex && !new RegExp(rules.regex).test(value)) {
          logger.warn(
            `Regex validation failed for ${param}: value=${value}, regex=${rules.regex}`
          );
          validationErrors.push({
            param,
            value,
            rule: "regex",
            message: rules.message || `${param} failed format validation`,
          });
        }

        if (typeof rules.min === "number" && Number(value) < rules.min) {
          logger.warn(
            `Min validation failed for ${param}: value=${value}, min=${rules.min}`
          );
          validationErrors.push({
            param,
            value,
            rule: "min",
            message: `${param} must be ≥ ${rules.min}`,
          });
        }

        if (typeof rules.max === "number" && Number(value) > rules.max) {
          logger.warn(
            `Max validation failed for ${param}: value=${value}, max=${rules.max}`
          );
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
          logger.warn(
            `Enum validation failed for ${param}: value=${value}, enum=${JSON.stringify(
              rules.enum
            )}`
          );
          validationErrors.push({
            param,
            value,
            rule: "enum",
            message: `${param} must be one of: ${rules.enum.join(", ")}`,
          });
        }
      });

      if (validationErrors.length > 0) {
        logger.warn(
          `Validation errors for source ${from}: ${JSON.stringify(
            validationErrors
          )}`
        );
        allErrors.push({
          source: from,
          type: "VALIDATION_FAILED",
          errors: validationErrors,
        });
      }

      // Merge with priority
      Object.assign(mergedInput, processedInput);
      logger.info(
        `Merged input after source ${from}: ${JSON.stringify(mergedInput)}`
      );
    }

    // Strict mode validation
    if (strictMode) {
      logger.info("Running strict mode validation");
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

      logger.info(
        `Allowed params in strict mode: ${JSON.stringify([...allowedParams])}`
      );
      logger.info(
        `Collected params: ${JSON.stringify([...allCollectedParams])}`
      );

      const unexpectedParams = [...allCollectedParams].filter(
        (p) => !allowedParams.has(p)
      );
      if (unexpectedParams.length > 0) {
        logger.warn(
          `Unexpected parameters in strict mode: ${JSON.stringify(
            unexpectedParams
          )}`
        );
        allErrors.push({
          type: "UNEXPECTED_PARAMS",
          params: unexpectedParams,
          message: `Unexpected parameters: ${unexpectedParams.join(", ")}`,
        });
      }
    }

    logger.info(`Final merged input: ${JSON.stringify(mergedInput)}`);
    logger.info(
      `All collected params: ${JSON.stringify([...allCollectedParams])}`
    );

    if (allErrors.length > 0) {
      logger.error(
        `Parameter processing failed with errors: ${JSON.stringify(allErrors)}`
      );
      throw {
        type: ErrorTypes.PARAMETER_PROCESSING_FAILED,
        message: "Parameter validation failed",
        details: allErrors,
        receivedParams: Object.keys(mergedInput),
      };
    }

    logger.info(`Parameters node processing completed successfully`);
    return mergedInput;
  }

  async processLogicNode(node, context, requestContext, executionContext) {
    logger.info(`Processing logic node: ${node.id}`);

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
    });

    try {
      // Wrap the code in a function and properly handle async execution
      const wrappedCode = `
        module.exports = async (input,context,executionContext) => { 
          try {
            ${node.data.code}
          } catch (err) {
            throw err;
          }
        }
      `;

      const func = vm.run(wrappedCode);
      const result = await func(context, context, executionContext);

      // Handle undefined results
      return result !== undefined ? result : context;
    } catch (err) {
      logger.error(`Logic node execution error: ${err}`);
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: err.message || "Error executing logic node",
        originalError: err.toString(),
      };
    }
  }

  async processMongoDBNode(node, context, requestContext, executionContext) {
    logger.info(`Processing database node: ${node.id}`);

    const { tenant } = requestContext.params;
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

    if (!tenant) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: "Missing tenant in node or input",
      };
    }

    const projectId = requestContext.params.projectId;
    if (!projectId) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: "Missing projectId in request context",
      };
    }

    const secret = await this.#secretService.getSecretByProvider(
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

    const resolvedFilter = replaceDynamicValues(
      query,
      context,
      executionContext
    );
    const resolvedData = replaceDynamicValues(data, context, executionContext);

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

  async processDatabaseNode(node, context, requestContext, executionContext) {
    logger.info(`Processing database node: ${node.id}`);

    const { tenant } = requestContext.params;
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

      const resolvedFilter = replaceDynamicValues(
        query,
        context,
        executionContext
      );
      const resolvedData = replaceDynamicValues(
        data,
        context,
        executionContext
      );

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
    context,
    requestContext,
    executionContext
  ) {
    logger.info(`Processing JWT generate node: ${node.id}`);

    const { tenant } = requestContext.params;
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

    const projectId = requestContext.params.projectId;
    if (!projectId) {
      throw {
        type: ErrorTypes.EXECUTION_FAILED,
        message: "Missing projectId in request context",
      };
    }

    const secret = await this.#secretService.getSecretByProvider(
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

    const resolvedPayload = replaceDynamicValues(
      payload,
      context,
      executionContext
    );
    const token = jwt.sign(resolvedPayload, jwtSecret, { expiresIn });

    return { token: `Bearer ${token}` };
  }

  async processJWTVerifyNode(
    node,
    context,
    requestContext,
    executionContext,
    isRealTime = true
  ) {
    const { tenant } = requestContext.params;
    const { type = "jwt" } = node.data;
    const firstNodeId = Object.keys(executionContext)[1];
    let token = executionContext[firstNodeId].result.authorization;
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
      projectId = requestContext.params.projectId;
    } else {
      projectId = workflow.project;
    }

    const secret = await this.#secretService.getSecretByProvider(
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

  async processLoopNode(node, context, req, executionContext) {
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
    // console.log("loop node");
    // console.log("items", items);
    const resolvedItems = replaceDynamicValues(
      items,
      context,
      executionContext
    );
    console.log("Loop node resolved items:", resolvedItems);

    // Ensure items is an array
    const itemsArray = Array.isArray(resolvedItems)
      ? resolvedItems
      : [resolvedItems];
    // console.log("Items array:", itemsArray);

    // Store the current iteration index in context
    const loopContext = executionContext.loop || {};
    const currentIndex = loopContext.currentIndex || 0;

    // Check if we have more items to process
    const hasMoreItems = currentIndex < itemsArray.length;

    // Get the current item
    const currentItem = itemsArray[currentIndex];
    // console.log("Current item:", currentItem);

    // Update the loop context
    executionContext.loop = {
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
      loopContext: executionContext.loop,
    };
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

  async processResponseNode(node, context, requestContext, executionContext) {
    logger.info(`Processing response node: ${node.id}`);
    const { status = 200 } = node.data || {};

    const token = context["jwtGenerate"];

    if (token) {
      return {
        status,
        token: token,
        data: context,
      };
    }
    return {
      status,
      data: context,
    };
  }
}
