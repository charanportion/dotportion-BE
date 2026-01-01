import { MongoClient } from "mongodb";

export class PlatformSchemaHandler {
  constructor(platformUri, logger) {
    this.platformUri = platformUri;
    this.logger = logger;
    this.client = null;
    this.db = null;
    this.logger.info("PlatformSchemaHandler initialized for platform database");
  }

  async connect(tenant) {
    try {
      this.logger.info(
        `Attempting to connect to platform database for tenant: ${tenant}`
      );

      if (!this.platformUri) {
        throw new Error("Platform MongoDB URI not configured");
      }

      this.client = new MongoClient(this.platformUri);
      await this.client.connect();

      // Use tenant-specific database
      const dbName = `dotportion_tenant_${tenant}`;
      this.db = this.client.db(dbName);

      this.logger.info(
        `Successfully connected to platform database: ${dbName}`
      );

      // Verify database connection
      const adminDb = this.client.db("admin");
      const dbStats = await adminDb.command({ listDatabases: 1 });
      this.logger.info(
        "Available databases:",
        dbStats.databases.map((db) => db.name)
      );

      return true;
    } catch (error) {
      this.logger.error("Failed to connect to platform MongoDB:", error);
      throw error;
    }
  }

  async close() {
    if (this.client) {
      try {
        await this.client.close();
        this.logger.info("Platform MongoDB connection closed successfully");
      } catch (error) {
        this.logger.error("Error closing platform MongoDB connection:", error);
      }
    }
  }

  async createSchema(tenant, collection, schema) {
    try {
      await this.connect(tenant);

      const existing = await this.db
        .listCollections({ name: collection })
        .toArray();

      this.logger.info(
        `Checking for existing collection ${collection} in platform database:`,
        existing
      );

      if (existing.length > 0) {
        await this.close();
        throw new Error("Collection already exists in platform database");
      }

      // Create the collection in platform database
      await this.db.createCollection(collection);
      this.logger.info(
        `Created collection in platform database: ${collection}`
      );

      // Store schema metadata in platform database
      const metadataResult = await this.db
        .collection("__schema_metadata__")
        .insertOne({
          collection,
          schema,
          createdAt: new Date(),
          dbType: "platform",
          tenant,
        });

      this.logger.info("Platform schema metadata inserted:", metadataResult);

      await this.close();
      return { collection, dbType: "platform" };
    } catch (error) {
      this.logger.error("Error in platform createSchema:", error);
      await this.close();
      throw error;
    }
  }

  async getSchema(tenant, collection) {
    try {
      await this.connect(tenant);

      this.logger.info(
        `Getting schema for collection: ${collection} from platform database`
      );

      // List all collections in the platform database
      const collections = await this.db.listCollections().toArray();
      this.logger.info(
        "Available collections in platform database:",
        collections.map((c) => c.name)
      );

      // Check if __schema_metadata__ collection exists
      const metadataExists = collections.some(
        (c) => c.name === "__schema_metadata__"
      );
      this.logger.info(
        "__schema_metadata__ collection exists in platform database:",
        metadataExists
      );

      if (!metadataExists) {
        throw new Error(
          "__schema_metadata__ collection does not exist in platform database"
        );
      }

      // Get the schema from platform database
      const query = { collection, tenant };
      this.logger.info("Querying platform database with:", query);

      const result = await this.db
        .collection("__schema_metadata__")
        .findOne(query);
      this.logger.info("Platform schema query result:", result);

      await this.close();

      if (!result) {
        this.logger.error(
          `No schema found for collection: ${collection} in platform database`
        );
        throw new Error(
          `No schema found for collection: ${collection} in platform database`
        );
      }

      return result.schema;
    } catch (error) {
      this.logger.error("Error in platform getSchema:", error);
      await this.close();
      throw error;
    }
  }

  async updateSchema(tenant, collection, newSchema) {
    try {
      await this.connect(tenant);

      const result = await this.db.collection("__schema_metadata__").updateOne(
        { collection, tenant },
        {
          $set: {
            schema: newSchema,
            updatedAt: new Date(),
          },
        }
      );

      this.logger.info("Update platform schema result:", result);

      await this.close();

      if (result.matchedCount === 0) {
        throw new Error("Schema not found in platform database");
      }
      return { collection, updated: true, dbType: "platform" };
    } catch (error) {
      this.logger.error("Error in platform updateSchema:", error);
      await this.close();
      throw error;
    }
  }

  async deleteSchema(tenant, collection) {
    try {
      await this.connect(tenant);

      // Drop the collection from platform database
      await this.db
        .collection(collection)
        .drop()
        .catch((error) => {
          this.logger.warn(
            `Error dropping collection ${collection} from platform database:`,
            error
          );
        });

      // Delete schema metadata from platform database
      const deleteResult = await this.db
        .collection("__schema_metadata__")
        .deleteOne({ collection, tenant });

      this.logger.info("Delete platform schema result:", deleteResult);

      await this.close();
      return { collection, deleted: true, dbType: "platform" };
    } catch (error) {
      this.logger.error("Error in platform deleteSchema:", error);
      await this.close();
      throw error;
    }
  }

  async getAvailableCollections(tenant) {
    try {
      await this.connect(tenant);
      this.logger.info("Getting available collections from platform database");

      // Get all collections that have schemas in __schema_metadata__
      const schemaDocs = await this.db
        .collection("__schema_metadata__")
        .find({ tenant })
        .toArray();

      const availableCollections = schemaDocs.map((doc) => doc.collection);

      this.logger.info(
        "Available collections with schemas in platform database:",
        availableCollections
      );

      await this.close();
      return availableCollections;
    } catch (error) {
      this.logger.error(
        "Error getting available collections from platform database:",
        error
      );
      await this.close();
      throw error;
    }
  }

  async getCollectionParameters(tenant, collection) {
    try {
      await this.connect(tenant);

      // Get schema from metadata in platform database
      const schemaDoc = await this.db
        .collection("__schema_metadata__")
        .findOne({
          collection,
          tenant,
        });

      if (!schemaDoc) {
        throw new Error(
          `No schema found for collection: ${collection} in platform database`
        );
      }

      // Transform schema into parameter options
      const parameters = Object.entries(schemaDoc.schema).map(
        ([fieldName, fieldSchema]) => ({
          name: fieldName,
          type: fieldSchema.type,
          required: fieldSchema.required || false,
          unique: fieldSchema.unique || false,
          default: fieldSchema.default,
          min: fieldSchema.min,
          max: fieldSchema.max,
          enum: fieldSchema.enum,
          description: fieldSchema.description || `${fieldName} field`,
        })
      );

      this.logger.info(
        `Parameters for collection ${collection} in platform database:`,
        parameters
      );

      await this.close();
      return parameters;
    } catch (error) {
      this.logger.error(
        "Error getting collection parameters from platform database:",
        error
      );
      await this.close();
      throw error;
    }
  }

  async getAllCollectionsWithParameters(tenant) {
    try {
      await this.connect(tenant);

      // Get all collections from platform database
      const collections = await this.getAvailableCollections(tenant);

      // Get parameters for each collection from platform database
      const collectionsWithParams = await Promise.all(
        collections.map(async (collection) => {
          try {
            const parameters = await this.getCollectionParameters(
              tenant,
              collection
            );
            return {
              collection,
              parameters,
              dbType: "platform",
            };
          } catch (error) {
            this.logger.warn(
              `Could not get parameters for collection ${collection} from platform database:`,
              error
            );
            return {
              collection,
              parameters: [],
              dbType: "platform",
            };
          }
        })
      );

      await this.close();
      return collectionsWithParams;
    } catch (error) {
      this.logger.error(
        "Error getting all collections with parameters from platform database:",
        error
      );
      await this.close();
      throw error;
    }
  }
}
