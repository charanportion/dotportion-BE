import { MongoClient } from "mongodb";

export class MongoSchemaHandler {
  constructor(secrets, logger) {
    this.secrets = secrets;
    this.client = null;
    this.db = null;
    this.logger = logger;
    this.logger.info("MongoSchemaHandler initialized with secrets:", {
      tenant: secrets.tenant,
      uri: secrets.data.uri ? "URI exists" : "URI missing",
    });
  }

  async connect() {
    try {
      this.logger.info("Attempting to connect to MongoDB...");
      this.client = new MongoClient(this.secrets.data.uri);
      await this.client.connect();
      this.logger.info(
        `Successfully connected to MongoDB. Using database: ${this.secrets.tenant}`
      );
      this.db = this.client.db(this.secrets.tenant);

      // Verify database connection
      const adminDb = this.client.db("admin");
      const dbStats = await adminDb.command({ listDatabases: 1 });
      this.logger.info(
        "Available databases:",
        dbStats.databases.map((db) => db.name)
      );

      return true;
    } catch (error) {
      this.logger.error("Failed to connect to MongoDB:", error);
      throw error;
    }
  }

  async close() {
    if (this.client) {
      try {
        await this.client.close();
        this.logger.info("MongoDB connection closed successfully");
      } catch (error) {
        this.logger.error("Error closing MongoDB connection:", error);
      }
    }
  }

  async createSchema(collectionName, schema) {
    try {
      await this.connect();

      const existing = await this.db
        .listCollections({ name: collectionName })
        .toArray();

      this.logger.info(
        `Checking for existing collection ${collectionName}:`,
        existing
      );

      if (existing.length > 0) {
        await this.close();
        throw new Error("Collection already exists");
      }

      await this.db.createCollection(collectionName);
      this.logger.info(`Created collection: ${collectionName}`);

      const metadataResult = await this.db
        .collection("__schema_metadata__")
        .insertOne({ collection: collectionName, schema });

      this.logger.info("Schema metadata inserted:", metadataResult);

      await this.close();
      return { collection: collectionName };
    } catch (error) {
      this.logger.error("Error in createSchema:", error);
      await this.close();
      throw error;
    }
  }

  async getSchema(collectionName) {
    try {
      await this.connect();

      this.logger.info(`Getting schema for collection: ${collectionName}`);
      this.logger.info(`Using database: ${this.secrets.tenant}`);

      // List all collections in the database
      const collections = await this.db.listCollections().toArray();
      this.logger.info(
        "Available collections:",
        collections.map((c) => c.name)
      );

      // Check if __schema_metadata__ collection exists
      const metadataExists = collections.some(
        (c) => c.name === "__schema_metadata__"
      );
      this.logger.info(
        "__schema_metadata__ collection exists:",
        metadataExists
      );

      if (!metadataExists) {
        throw new Error("__schema_metadata__ collection does not exist");
      }

      // First, let's check what's in the metadata collection
      const allMetadata = await this.db
        .collection("__schema_metadata__")
        .find({})
        .toArray();
      this.logger.info("All metadata entries:", allMetadata);

      // Get the schema with more detailed query
      const query = { collection: collectionName };
      this.logger.info("Querying with:", query);

      const result = await this.db
        .collection("__schema_metadata__")
        .findOne(query);
      this.logger.info("Schema query result:", result);

      await this.close();

      if (!result) {
        this.logger.error(`No schema found for collection: ${collectionName}`);
        throw new Error(`No schema found for collection: ${collectionName}`);
      }

      return result.schema;
    } catch (error) {
      this.logger.error("Error in getSchema:", error);
      await this.close();
      throw error;
    }
  }

  async updateSchema(collectionName, newSchema) {
    try {
      await this.connect();

      const result = await this.db
        .collection("__schema_metadata__")
        .updateOne(
          { collection: collectionName },
          { $set: { schema: newSchema } }
        );

      this.logger.info("Update schema result:", result);

      await this.close();

      if (result.matchedCount === 0) throw new Error("Schema not found");
      return { collection: collectionName, updated: true };
    } catch (error) {
      this.logger.error("Error in updateSchema:", error);
      await this.close();
      throw error;
    }
  }

  async deleteSchema(collectionName) {
    try {
      await this.connect();

      await this.db
        .collection(collectionName)
        .drop()
        .catch((error) => {
          this.logger.warn(
            `Error dropping collection ${collectionName}:`,
            error
          );
        });

      const deleteResult = await this.db
        .collection("__schema_metadata__")
        .deleteOne({ collection: collectionName });

      this.logger.info("Delete schema result:", deleteResult);

      await this.close();
      return { collection: collectionName, deleted: true };
    } catch (error) {
      this.logger.error("Error in deleteSchema:", error);
      await this.close();
      throw error;
    }
  }

  async getAvailableCollections() {
    try {
      await this.connect();
      this.logger.info("Getting available collections");

      // Get all collections that have schemas in __schema_metadata__
      const schemaDocs = await this.db
        .collection("__schema_metadata__")
        .find({})
        .toArray();

      const availableCollections = schemaDocs.map((doc) => doc.collection);

      this.logger.info(
        "Available collections with schemas:",
        availableCollections
      );

      await this.close();
      return availableCollections;
    } catch (error) {
      this.logger.error("Error getting available collections:", error);
      await this.close();
      throw error;
    }
  }

  async getCollectionParameters(collectionName) {
    try {
      await this.connect();

      // Get schema from metadata
      const schemaDoc = await this.db
        .collection("__schema_metadata__")
        .findOne({
          collection: collectionName,
        });

      if (!schemaDoc) {
        throw new Error(`No schema found for collection: ${collectionName}`);
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
        `Parameters for collection ${collectionName}:`,
        parameters
      );

      await this.close();
      return parameters;
    } catch (error) {
      this.logger.error("Error getting collection parameters:", error);
      await this.close();
      throw error;
    }
  }

  async getAllCollectionsWithParameters() {
    try {
      await this.connect();

      // Get all collections
      const collections = await this.getAvailableCollections();

      // Get parameters for each collection
      const collectionsWithParams = await Promise.all(
        collections.map(async (collectionName) => {
          try {
            const parameters = await this.getCollectionParameters(
              collectionName
            );
            return {
              collection: collectionName,
              parameters,
            };
          } catch (error) {
            this.logger.warn(
              `Could not get parameters for collection ${collectionName}:`,
              error
            );
            return {
              collection: collectionName,
              parameters: [],
            };
          }
        })
      );

      await this.close();
      return collectionsWithParams;
    } catch (error) {
      this.logger.error(
        "Error getting all collections with parameters:",
        error
      );
      await this.close();
      throw error;
    }
  }

  async replaceAllCollections(tenant, collectionsArray) {
    try {
      await this.connect();
      this.logger.info(
        `Replacing all collections in database: ${this.secrets.tenant}`
      );

      // Step 1: Get all existing collections
      const existingCollections = await this.db
        .collection("__schema_metadata__")
        .find({})
        .toArray();

      this.logger.info(
        `Found ${existingCollections.length} existing collections to delete`
      );

      // Step 2: Delete all existing collections and their metadata
      for (const doc of existingCollections) {
        const collectionName = doc.collection;
        this.logger.info(`Deleting collection: ${collectionName}`);

        // Drop the collection (ignore errors if collection doesn't exist)
        try {
          await this.db.collection(collectionName).drop();
          this.logger.info(`Dropped collection: ${collectionName}`);
        } catch (error) {
          this.logger.warn(
            `Could not drop collection ${collectionName}:`,
            error.message
          );
        }

        // Delete metadata
        await this.db
          .collection("__schema_metadata__")
          .deleteOne({ collection: collectionName });
        this.logger.info(`Deleted metadata for collection: ${collectionName}`);
      }

      // Step 3: Create new collections from the provided array
      const createdCollections = [];
      for (const item of collectionsArray) {
        const { collection, schema } = item;
        this.logger.info(`Creating new collection: ${collection}`);

        // Create the collection
        await this.db.createCollection(collection);
        this.logger.info(`Created collection: ${collection}`);

        // Insert schema metadata
        await this.db.collection("__schema_metadata__").insertOne({
          collection,
          schema,
          createdAt: new Date(),
        });
        this.logger.info(`Inserted metadata for collection: ${collection}`);

        createdCollections.push(collection);
      }

      await this.close();

      this.logger.info(
        `Successfully replaced all collections. Created ${createdCollections.length} new collections`
      );

      return {
        success: true,
        deletedCount: existingCollections.length,
        createdCollections,
      };
    } catch (error) {
      this.logger.error("Error in replaceAllCollections:", error);
      await this.close();
      throw error;
    }
  }
}
