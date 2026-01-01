export class SchemaCanvasService {
  constructor(
    dbHandler,
    logger,
    schemaCanvasModel,
    MongoSchemaHandler,
    PlatformSchemaHandler
  ) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.schemaCanvasModel = schemaCanvasModel;
    this.MongoSchemaHandler = MongoSchemaHandler;
    this.PlatformSchemaHandler = PlatformSchemaHandler;
    this.logger.info(
      `-->Schema Canvas Service initialized with dual dataBase support`
    );
  }

  async getHandler(provider, secrets) {
    switch (provider) {
      case "platform":
        const platformUri = process.env.MONGO_URI;
        if (!platformUri) {
          throw Object.assign(
            new Error("Platform MongoDB URI not configured"),
            {
              statusCode: 500,
            }
          );
        }
        return new this.PlatformSchemaHandler(platformUri, this.logger);
      case "mongodb":
        return new this.MongoSchemaHandler(secrets, this.logger);
      default:
        throw Object.assign(new Error("Unsupported provider"), {
          statusCode: 400,
        });
    }
  }

  async createSchemaCanvas(projectId, dataBase, userId, nodes, edges) {
    try {
      this.logger.info(
        `-->createSchemaCanvas service invoked with projectId: ${projectId}, dataBase: ${dataBase}`
      );
      if (!projectId) {
        this.logger.warn("createSchemaCanvas called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      if (!dataBase) {
        this.logger.warn("createSchemaCanvas called without a dataBase.");
        return { error: true, message: "No dataBase" };
      }
      if (!userId) {
        this.logger.warn("createSchemaCanvas called without a userId.");
        return { error: true, message: "No userId" };
      }
      if (!nodes) {
        this.logger.warn("createSchemaCanvas called without a nodes.");
        return { error: true, message: "No nodes" };
      }
      if (!edges) {
        this.logger.warn("createSchemaCanvas called without a edges.");
        return { error: true, message: "No edges" };
      }

      await this.dbHandler.connectDb();

      const schemaCanvas = new this.schemaCanvasModel({
        projectId,
        dataBase,
        owner: userId,
        nodes,
        edges,
      });

      await schemaCanvas.save();
      return schemaCanvas.toObject();
    } catch (error) {
      this.logger.error("Error in createSchemaCanvas service:", error);
      return { error: true, message: "Error creating schema canvas" };
    }
  }

  async updateSchemaCanvas(projectId, dataBase, userId, nodes, edges) {
    try {
      this.logger.info(
        `-->createSchemaCanvas service invoked with projectId: ${projectId}, dataBase: ${dataBase}`
      );
      if (!projectId) {
        this.logger.warn("createSchemaCanvas called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      if (!dataBase) {
        this.logger.warn("createSchemaCanvas called without a dataBase.");
        return { error: true, message: "No dataBase" };
      }
      if (!userId) {
        this.logger.warn("createSchemaCanvas called without a userId.");
        return { error: true, message: "No userId" };
      }
      if (!nodes) {
        this.logger.warn("createSchemaCanvas called without a nodes.");
        return { error: true, message: "No nodes" };
      }
      if (!edges) {
        this.logger.warn("createSchemaCanvas called without a edges.");
        return { error: true, message: "No edges" };
      }

      await this.dbHandler.connectDb();

      const schemaCanvas = await this.schemaCanvasModel.findOneAndUpdate(
        {
          projectId,
          dataBase,
          owner: userId,
        },
        { nodes, edges }
      );
      if (!schemaCanvas) {
        return {
          error: true,
          message: "schemaCanvas not found or access denied",
        };
      }
      await schemaCanvas.save();
      return schemaCanvas.toObject();
    } catch (error) {
      this.logger.error("Error in createSchemaCanvas service:", error);
      return { error: true, message: "Error creating schema canvas" };
    }
  }

  async getSchemaCanvas(projectId, dataBase, userId) {
    try {
      this.logger.info(
        `-->getSchemaCanvas service invoked with projectId: ${projectId}, dataBase: ${dataBase}`
      );
      if (!projectId) {
        this.logger.warn("getSchemaCanvas called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      if (!dataBase) {
        this.logger.warn("getSchemaCanvas called without a dataBase.");
        return { error: true, message: "No dataBase" };
      }
      if (!userId) {
        this.logger.warn("getSchemaCanvas called without a userId.");
        return { error: true, message: "No userId" };
      }

      await this.dbHandler.connectDb();

      const schemaCanvas = await this.schemaCanvasModel.find({
        projectId,
        dataBase,
        owner: userId,
      });

      if (!schemaCanvas) {
        return {
          error: true,
          message: "schemaCanvas not found or access denied",
        };
      }

      return schemaCanvas;
    } catch (error) {
      this.logger.error("Error in createSchemaCanvas service:", error);
      return { error: true, message: "Error creating schema canvas" };
    }
  }

  mapFieldType(type) {
    const typeMap = {
      string: "String",
      number: "Number",
      boolean: "Boolean",
      date: "Date",
      array: "Array",
      objectid: "ObjectId",
      mixed: "Mixed",
    };

    return typeMap[type.toLowerCase()] || "String";
  }

  sanitizeCollectionName(label) {
    return label
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }

  parseSchemaToCollections(data) {
    this.logger.info(
      `-->parseSchemaToCollections invoked with data: ${JSON.stringify(data)}`
    );
    const collections = [];

    this.logger.info(
      `-->parseSchemaToCollections  collections: ${collections}`
    );

    // Create a map of node IDs to collection names
    const nodeIdToCollection = {};
    data.nodes.forEach((node) => {
      nodeIdToCollection[node.id] = node.label;
    });

    this.logger.info(
      `-->parseSchemaToCollections  nodeIdToCollection: ${nodeIdToCollection}`
    );

    // Create a map of field IDs to field names for each node
    const fieldIdToName = {};
    data.nodes.forEach((node) => {
      fieldIdToName[node.id] = {};
      node.fields.forEach((field) => {
        fieldIdToName[node.id][field.id] = field.name;
      });
    });

    this.logger.info(
      `-->parseSchemaToCollections  fieldIdToName: ${fieldIdToName}`
    );

    // Create a map to store references (which fields reference which collections)
    const fieldReferences = {};

    // Process edges to determine references
    data.edges.forEach((edge) => {
      const sourceCollection = nodeIdToCollection[edge.sourceNode];
      const targetCollection = nodeIdToCollection[edge.targetNode];

      // Extract field ID from targetHandle (format: "tgt-{fieldId}")
      const targetFieldId = edge.targetHandle?.replace("tgt-", "");

      if (targetFieldId && targetCollection) {
        // Store that this field in target node references the source collection
        const key = `${edge.targetNode}-${targetFieldId}`;
        fieldReferences[key] = sourceCollection;
      }
    });

    this.logger.info(
      `-->parseSchemaToCollections  fieldReferences: ${fieldReferences}`
    );

    // Build the collections array
    data.nodes.forEach((node) => {
      const collection = {
        collection: node.label,
        schema: {},
      };

      node.fields.forEach((field) => {
        const fieldSchema = {
          type: field.type,
          required: field.name === "_id" ? true : field.required,
        };

        // Check if this field has a reference
        const refKey = `${node.id}-${field.id}`;
        if (fieldReferences[refKey]) {
          fieldSchema.ref = fieldReferences[refKey];
        }

        collection.schema[field.name] = fieldSchema;
      });

      collections.push(collection);
    });

    this.logger.info(
      `-->parseSchemaToCollections  fieldReferences: ${collections}`
    );

    return collections;
  }

  async generateSchema(projectId, dataBase, userId, secret, tenant) {
    try {
      this.logger.info(
        `-->generateSchema service invoked with projectId: ${projectId}, dataBase: ${dataBase}`
      );
      if (!projectId) {
        this.logger.warn("generateSchema called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      if (!dataBase) {
        this.logger.warn("generateSchema called without a dataBase.");
        return { error: true, message: "No dataBase" };
      }
      if (!userId) {
        this.logger.warn("generateSchema called without a userId.");
        return { error: true, message: "No userId" };
      }
      if (!tenant) {
        this.logger.warn("generateSchema called without a tenant.");
        return { error: true, message: "No tenant" };
      }
      if (dataBase !== "platform" && !secret) {
        this.logger.warn("generateSchema called without a secret.");
        return { error: true, message: "No secret" };
      }

      const schema = await this.getSchemaCanvas(projectId, dataBase, userId);
      if (schema.error) {
        return {
          error: true,
          message: "schemaCanvas not found or access denied",
        };
      }

      this.logger.info(`-->Fetched schema canvas ${schema}`);

      const collections = this.parseSchemaToCollections(schema[0]);

      this.logger.info(`-->generated schemas ${collections}`);

      const handler = await this.getHandler(dataBase, secret);

      this.logger.info(`-->got the handler ${JSON.stringify(tenant)}`);

      const result = await handler.replaceAllCollections(tenant, collections);
      this.logger.info(`-->saved schemas ${result}`);

      return result;
    } catch (error) {
      this.logger.error(`Error in generateSchema service: ${error}`);
      return { error: true, message: "Error in  generate Schema" };
    }
  }
}
