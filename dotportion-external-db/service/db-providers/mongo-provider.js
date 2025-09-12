import { MongoClient, ObjectId } from "mongodb";
import { BaseProvider } from "./base-provider.js";

export class MongoProvider extends BaseProvider {
  constructor(connectionString, logger, tenant = null) {
    super(logger);
    this.connectionString = connectionString;
    this.tenant = tenant;
    this.client = null;
    this.db = null;
    this.logger.info("--> MongoProvider initialized");
  }

  async connect() {
    if (this.client && this.client.isConnected) {
      this.logger.info("--> Using existing MongoDB client connection.");
      return;
    }
    this.logger.info(
      `--> Creating new MongoDB client connection to: ${this.connectionString}`
    );
    this.client = new MongoClient(this.connectionString);
    await this.client.connect();

    // Use tenant as database name if available, otherwise parse from connection string
    let dbName = "test"; // default fallback
    if (this.tenant) {
      dbName = this.tenant;
    } else {
      // Parse the connection string to extract database name
      const url = new URL(this.connectionString);
      dbName = url.pathname.slice(1) || "test"; // Remove leading slash and default to 'test'
    }
    this.db = this.client.db(dbName);

    this.logger.info(
      `<-- MongoDB client connected successfully to database: ${this.db.databaseName}`
    );
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.logger.info("--> MongoDB client disconnected.");
    }
  }

  async listCollections() {
    try {
      await this.connect();
      this.logger.info(`--> Connected to database: ${this.db.databaseName}`);

      // First, let's see what databases are available
      const adminDb = this.client.db("admin");
      const databases = await adminDb.admin().listDatabases();
      this.logger.info(
        `--> Available databases: ${JSON.stringify(
          databases.databases.map((db) => db.name)
        )}`
      );

      const collections = await this.db.listCollections().toArray();
      this.logger.info(
        `--> Found collections in ${this.db.databaseName}: ${JSON.stringify(
          collections.map((c) => c.name)
        )}`
      );
      return collections
        .map((c) => c.name)
        .filter(
          (name) =>
            !name.startsWith("system.") && name !== "__schema_metadata__"
        );
    } finally {
      await this.disconnect();
    }
  }

  async getDocuments(collectionName, { page = 1, limit = 20 }) {
    try {
      await this.connect();
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
      };
    } finally {
      await this.disconnect();
    }
  }

  async createDocument(collectionName, data) {
    try {
      await this.connect();
      const collection = this.db.collection(collectionName);
      const result = await collection.insertOne(data);
      return { _id: result.insertedId, ...data };
    } catch (error) {
      this.logger.error("Error in createDocument:", error);
      return {
        error: true,
        message: "Failed to create document.",
        error: error.message,
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
          `Document with ID ${documentId} not found in collection ${collectionName}`
        );

        // Let's also check what documents exist in this collection
        const allDocs = await collection.find({}).limit(5).toArray();
        this.logger.info(
          `Available documents in ${collectionName}: ${JSON.stringify(
            allDocs.map((doc) => ({ _id: doc._id, name: doc.name }))
          )}`
        );

        return null;
      }

      this.logger.info(
        `Found existing document: ${JSON.stringify(existingDoc)}`
      );

      // Ensure we don't try to update the immutable _id
      delete data._id;
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(documentId) },
        { $set: data },
        { returnDocument: "after" }
      );

      this.logger.info(`Update result: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error("Error in updateDocument:", error);
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
      return { deletedCount: result.deletedCount };
    } finally {
      await this.disconnect();
    }
  }
}
