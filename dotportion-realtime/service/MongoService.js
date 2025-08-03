import { MongoClient } from "mongodb";
import logger from "/opt/nodejs/utils/logger.js";

let mongoClient; // Reuse client across invocations

export class MongoService {
  async #getDb() {
    if (
      mongoClient &&
      mongoClient.topology &&
      mongoClient.topology.isConnected()
    ) {
      return mongoClient.db("workflow-connections");
    }
    try {
      logger.info("Initializing new MongoDB connection...");
      mongoClient = new MongoClient(process.env.MONGO_URI);
      await mongoClient.connect();
      logger.info("Successfully connected to MongoDB.");
      return mongoClient.db("workflow-connections");
    } catch (error) {
      logger.error("Failed to connect to MongoDB", error);
      throw error;
    }
  }

  async #getConnectionsCollection() {
    const db = await this.#getDb();
    const collection = db.collection("connections");

    try {
      const indexes = await collection.indexes();
      if (!indexes.some((index) => index.name === "ttl_idx")) {
        logger.info("Creating TTL index on connections collection.");
        await collection.createIndex(
          { createdAt: 1 },
          { expireAfterSeconds: 7200, name: "ttl_idx" }
        );
      }
    } catch (error) {
      // If the collection doesn't exist, create it and the index
      if (error.message.includes("ns does not exist")) {
        logger.info(
          "Connections collection does not exist. Creating it with TTL index."
        );
        await collection.createIndex(
          { createdAt: 1 },
          { expireAfterSeconds: 7200, name: "ttl_idx" }
        );
      } else {
        throw error;
      }
    }

    return collection;
  }

  async saveConnection(executionId, connectionId) {
    const collection = await this.#getConnectionsCollection();
    await collection.updateOne(
      { executionId },
      { $set: { connectionId, createdAt: new Date() } },
      { upsert: true }
    );
  }

  async getConnectionId(executionId) {
    const collection = await this.#getConnectionsCollection();
    const doc = await collection.findOne({ executionId });
    return doc ? doc.connectionId : null;
  }

  async deleteConnectionByConnectionId(connectionId) {
    const collection = await this.#getConnectionsCollection();
    await collection.deleteOne({ connectionId });
  }

  async deleteExecution(executionId) {
    const collection = await this.#getConnectionsCollection();
    await collection.deleteOne({ executionId });
  }
}
