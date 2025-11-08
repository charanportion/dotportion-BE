import { MongoClient, ObjectId } from "mongodb";
import { BaseProvider } from "./base-provider.js";

export class PlatformProvider extends BaseProvider {
  constructor(platformUri, tenant, logger) {
    super(logger);
    this.platformUri = platformUri;
    this.tenant = tenant;
    this.client = null;
    this.db = null;
    this.logger.info(`--> PlatformProvider initialized for tenant: ${tenant}`);
  }

  async connect() {
    if (this.client && this.client.isConnected) {
      this.logger.info(
        "--> Using existing platform MongoDB client connection."
      );
      return;
    }

    if (!this.platformUri) {
      throw new Error("Platform MongoDB URI not configured");
    }

    this.logger.info(
      `--> Creating new platform MongoDB client connection for tenant: ${this.tenant}`
    );

    this.client = new MongoClient(this.platformUri);
    await this.client.connect();

    // Use tenant-specific database
    const dbName = `dotportion_tenant_${this.tenant}`;
    this.db = this.client.db(dbName);

    this.logger.info(
      `<-- Platform MongoDB client connected successfully to database: ${this.db.databaseName}`
    );
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.logger.info("--> Platform MongoDB client disconnected.");
    }
  }

  async listCollections() {
    try {
      await this.connect();
      this.logger.info(
        `--> Connected to platform database: ${this.db.databaseName}`
      );

      // First, let's see what databases are available
      const adminDb = this.client.db("admin");
      const databases = await adminDb.admin().listDatabases();
      this.logger.info(
        `--> Available platform databases: ${JSON.stringify(
          databases.databases.map((db) => db.name)
        )}`
      );

      const collections = await this.db.listCollections().toArray();
      this.logger.info(
        `--> Found collections in platform database ${
          this.db.databaseName
        }: ${JSON.stringify(collections.map((c) => c.name))}`
      );

      // Filter out system collections and schema metadata
      const userCollections = collections
        .map((c) => c.name)
        .filter(
          (name) =>
            !name.startsWith("system.") && name !== "__schema_metadata__"
        );

      return userCollections;
    } finally {
      await this.disconnect();
    }
  }

  async getDocuments(collectionName, { page = 1, limit = 20 }) {
    try {
      await this.connect();

      // Auto-create test collection if it doesn't exist and we're accessing it
      if (collectionName === "test") {
        const collections = await this.db
          .listCollections({ name: "test" })
          .toArray();
        if (collections.length === 0) {
          await this.db.createCollection("test");
          this.logger.info(
            `Auto-created 'test' collection for tenant: ${this.tenant}`
          );
        }
      }

      const collection = this.db.collection(collectionName);
      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const [documents, totalDocuments] = await Promise.all([
        collection.find({}).skip(skip).limit(parseInt(limit, 10)).toArray(),
        collection.countDocuments(),
      ]);

      return {
        documents,
        pagination: {
          totalDocuments,
          currentPage: parseInt(page, 10),
          totalPages: Math.ceil(totalDocuments / limit),
          limit: parseInt(limit, 10),
        },
        dbType: "platform",
        tenant: this.tenant,
      };
    } finally {
      await this.disconnect();
    }
  }

  async createDocument(collectionName, data) {
    try {
      await this.connect();

      // Auto-create test collection if it doesn't exist and we're creating in it
      if (collectionName === "test") {
        const collections = await this.db
          .listCollections({ name: "test" })
          .toArray();
        if (collections.length === 0) {
          await this.db.createCollection("test");
          this.logger.info(
            `Auto-created 'test' collection for tenant: ${this.tenant}`
          );
        }
      } else {
        // For non-test collections, validate against schema if exists
        await this.validateDataAgainstSchema(collectionName, data);
      }

      const collection = this.db.collection(collectionName);

      const result = await collection.insertOne(data);
      return {
        _id: result.insertedId,
        ...data,
      };
    } catch (error) {
      this.logger.error("Error in platform createDocument:", error);
      return {
        error: true,
        message: "Failed to create document in platform database.",
        error: error.message,
        dbType: "platform",
      };
    } finally {
      await this.disconnect();
    }
  }

  async updateDocument(collectionName, documentId, data) {
    try {
      await this.connect();
      const collection = this.db.collection(collectionName);

      // Validate ObjectId format
      if (!ObjectId.isValid(documentId)) {
        this.logger.error(`Invalid ObjectId format: ${documentId}`);
        throw new Error(`Invalid ObjectId format: ${documentId}`);
      }

      // First, check if the document exists
      const existingDoc = await collection.findOne({
        _id: new ObjectId(documentId),
      });
      if (!existingDoc) {
        this.logger.error(
          `Document with ID ${documentId} not found in platform collection ${collectionName}`
        );

        // Let's also check what documents exist in this collection
        const allDocs = await collection.find({}).limit(5).toArray();
        this.logger.info(
          `Available documents in platform collection ${collectionName}: ${JSON.stringify(
            allDocs.map((doc) => ({ _id: doc._id, name: doc.name }))
          )}`
        );

        return null;
      }

      this.logger.info(
        `Found existing document in platform database: ${JSON.stringify(
          existingDoc
        )}`
      );

      // Ensure we don't try to update the immutable _id and add update metadata
      delete data._id;
      const updateData = {
        ...data,
      };

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(documentId) },
        { $set: updateData },
        { returnDocument: "after" }
      );

      this.logger.info(`Platform update result: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error("Error in platform updateDocument:", error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async deleteDocument(collectionName, documentId) {
    try {
      await this.connect();
      const collection = this.db.collection(collectionName);
      const result = await collection.deleteOne({
        _id: new ObjectId(documentId),
      });
      return {
        deletedCount: result.deletedCount,
        dbType: "platform",
        tenant: this.tenant,
      };
    } finally {
      await this.disconnect();
    }
  }

  async validateDataAgainstSchema(collectionName, data) {
    try {
      const schemaDoc = await this.db
        .collection("__schema_metadata__")
        .findOne({
          collection: collectionName,
          tenant: this.tenant,
        });

      if (!schemaDoc) {
        this.logger.info(
          `No schema found for collection ${collectionName}, skipping validation`
        );
        return; // No schema validation required
      }

      const schema = schemaDoc.schema;
      const validationErrors = [];

      // Basic schema validation
      for (const [fieldName, fieldSchema] of Object.entries(schema)) {
        const value = data[fieldName];

        // Check required fields
        if (fieldSchema.required && (value === undefined || value === null)) {
          validationErrors.push(`Field '${fieldName}' is required`);
          continue;
        }

        // Skip validation if field is not present and not required
        if (value === undefined || value === null) {
          continue;
        }

        // Type validation
        if (fieldSchema.type) {
          const expectedType = fieldSchema.type.toLowerCase();
          const actualType = typeof value;

          if (expectedType === "string" && actualType !== "string") {
            validationErrors.push(`Field '${fieldName}' must be a string`);
          } else if (expectedType === "number" && actualType !== "number") {
            validationErrors.push(`Field '${fieldName}' must be a number`);
          } else if (expectedType === "boolean" && actualType !== "boolean") {
            validationErrors.push(`Field '${fieldName}' must be a boolean`);
          }
        }

        // Range validation for numbers
        if (typeof value === "number") {
          if (fieldSchema.min !== undefined && value < fieldSchema.min) {
            validationErrors.push(
              `Field '${fieldName}' must be at least ${fieldSchema.min}`
            );
          }
          if (fieldSchema.max !== undefined && value > fieldSchema.max) {
            validationErrors.push(
              `Field '${fieldName}' must be at most ${fieldSchema.max}`
            );
          }
        }

        // Enum validation
        if (fieldSchema.enum && Array.isArray(fieldSchema.enum)) {
          if (!fieldSchema.enum.includes(value)) {
            validationErrors.push(
              `Field '${fieldName}' must be one of: ${fieldSchema.enum.join(
                ", "
              )}`
            );
          }
        }
      }

      if (validationErrors.length > 0) {
        throw new Error(
          `Platform schema validation failed: ${validationErrors.join(", ")}`
        );
      }
    } catch (error) {
      if (error.message.includes("Platform schema validation failed")) {
        throw error;
      }
      this.logger.error(
        `Platform schema validation error for collection ${collectionName}:`,
        error
      );
      // Don't fail on validation errors, just log them
    }
  }
}
