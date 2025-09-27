import { MongoClient } from "mongodb";
import logger from "/opt/nodejs/utils/logger.js";

export class PlatformDatabaseHandler {
  constructor(platformUri) {
    this.platformUri = platformUri;
    this.client = null;
    this.db = null;
  }

  async connect(tenant) {
    if (!this.platformUri) {
      throw new Error("Platform MongoDB URI not configured");
    }

    this.client = new MongoClient(this.platformUri);
    await this.client.connect();
    this.db = this.client.db(`dotportion_tenant_${tenant}`);
    logger.info(`Connected to platform database: dotportion_tenant_${tenant}`);
  }

  async close() {
    if (this.client) {
      await this.client.close();
    }
  }

  async ensureCollectionExists(collectionName, tenant) {
    const collections = await this.db
      .listCollections({ name: collectionName })
      .toArray();

    if (collections.length === 0) {
      // Auto-create standard collections
      if (collectionName === "test") {
        await this.db.createCollection("test");
        logger.info(`Auto-created 'test' collection for tenant: ${tenant}`);
        return;
      }

      // For custom collections, check if schema exists
      const schemaExists = await this.hasSchema(collectionName);
      if (schemaExists) {
        await this.db.createCollection(collectionName);
        logger.info(
          `Auto-created collection '${collectionName}' from schema for tenant: ${tenant}`
        );
      } else {
        throw new Error(
          `Collection '${collectionName}' does not exist and no schema is defined. Please create a schema first using the schema service.`
        );
      }
    }
  }

  async hasSchema(collectionName) {
    try {
      const schemaDoc = await this.db
        .collection("__schema_metadata__")
        .findOne({ collection: collectionName });
      return !!schemaDoc;
    } catch (error) {
      logger.warn(
        `Error checking schema for collection ${collectionName}:`,
        error
      );
      return false;
    }
  }

  async validateDataAgainstSchema(collectionName, data) {
    try {
      const schemaDoc = await this.db
        .collection("__schema_metadata__")
        .findOne({ collection: collectionName });

      if (!schemaDoc) {
        return { valid: true }; // No schema validation for collections without schemas
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

      return {
        valid: validationErrors.length === 0,
        errors: validationErrors,
      };
    } catch (error) {
      logger.error(
        `Schema validation error for collection ${collectionName}:`,
        error
      );
      return { valid: true }; // Default to valid if schema validation fails
    }
  }

  async executeOperation(
    operation,
    collection,
    resolvedFilter,
    resolvedData,
    options
  ) {
    const col = this.db.collection(collection);

    let result;
    switch (operation) {
      case "findOne":
        result = await col.findOne(resolvedFilter, options);
        break;
      case "findMany":
        result = await col.find(resolvedFilter, options).toArray();
        break;
      case "insertOne":
        // Validate data against schema before insertion
        const insertValidation = await this.validateDataAgainstSchema(
          collection,
          resolvedData
        );
        if (!insertValidation.valid) {
          throw new Error(
            `Schema validation failed: ${insertValidation.errors.join(", ")}`
          );
        }
        result = await col.insertOne(resolvedData);
        break;
      case "insertMany":
        // Validate each document in the array
        for (const doc of resolvedData) {
          const validation = await this.validateDataAgainstSchema(
            collection,
            doc
          );
          if (!validation.valid) {
            throw new Error(
              `Schema validation failed for document: ${validation.errors.join(
                ", "
              )}`
            );
          }
        }
        result = await col.insertMany(resolvedData);
        break;
      case "updateOne":
        // Validate update data against schema
        const updateValidation = await this.validateDataAgainstSchema(
          collection,
          resolvedData
        );
        if (!updateValidation.valid) {
          throw new Error(
            `Schema validation failed: ${updateValidation.errors.join(", ")}`
          );
        }
        result = await col.updateOne(
          resolvedFilter,
          { $set: resolvedData },
          options
        );
        break;
      case "updateMany":
        // Validate update data against schema
        const updateManyValidation = await this.validateDataAgainstSchema(
          collection,
          resolvedData
        );
        if (!updateManyValidation.valid) {
          throw new Error(
            `Schema validation failed: ${updateManyValidation.errors.join(
              ", "
            )}`
          );
        }
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
        throw new Error(`Unsupported DB operation: ${operation}`);
    }

    return result;
  }
}
