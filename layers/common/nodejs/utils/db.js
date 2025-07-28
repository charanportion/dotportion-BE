import mongoose from "mongoose";

export class DBHandler {
  constructor(MONGODB_URI, databaseName, logger) {
    this.client = null;
    this.cacheDb = null;
    this.mongodbURI = MONGODB_URI;
    this.databaseName = databaseName;
    this.logger = logger || console;
    this.logger.info(`-->DBHandler initialized`);
    this.logger.info(`-->DBHandler mongodbURI: ${this.mongodbURI}`);
    this.logger.info(`-->DBHandler databaseName: ${this.databaseName}`);
  }

  async connectDb() {
    this.logger.info(`--> connect ${this.mongodbURI}`);
    try {
      if (this.cacheDb && mongoose.connection.readyState === 1) {
        this.logger.info("--> Using cached mongoose connection");
        return this.cacheDb;
      }
      if (!this.mongodbURI) {
        this.logger.warn("Mongodb connection string not found.");
        return null;
      }

      this.logger.info(
        `--> Creating new mongoose connection: ${this.mongodbURI}`
      );

      // In Mongoose v6+, these options are deprecated and no longer needed.
      // Mongoose handles them automatically.
      const options = {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      };

      // Connect to MongoDB using mongoose
      await mongoose.connect(this.mongodbURI, options);

      this.logger.info(
        `<-- Created new mongoose connection: ${this.mongodbURI}`
      );

      // Store the connection
      this.cacheDb = mongoose.connection;

      this.logger.info(`<-- Connected to DB: ${this.databaseName}`);

      return this.cacheDb;
    } catch (error) {
      // ✅ FIX: Log the full error object to see the detailed message and stack trace.
      this.logger.error("DB Connection failed.", error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.cacheDb) {
        await mongoose.disconnect();
        this.cacheDb = null;
        this.logger.info("📊 MongoDB Disconnected");
      }
    } catch (error) {
      this.logger.error("Error disconnecting from MongoDB:", error);
      throw error;
    }
  }

  async isConnected() {
    try {
      return mongoose.connection.readyState === 1;
    } catch (error) {
      this.logger.error("Error checking connection status:", error);
      return false;
    }
  }

  getConnection() {
    return this.cacheDb || mongoose.connection;
  }

  // Helper method to get a specific database connection
  async getDatabase(databaseName = null) {
    const dbName = databaseName || this.databaseName;
    try {
      const connection = await this.connectDb();
      return connection.db(dbName);
    } catch (error) {
      this.logger.error(`Error getting database ${dbName}:`, error);
      throw error;
    }
  }
}

// Legacy function for backward compatibility
export const connectDB = async (MONGO_URI, databaseName = "default") => {
  const dbHandler = new DBHandler(MONGO_URI, databaseName, console); // Use console as default logger
  return await dbHandler.connectDb();
};

// Export a factory function to create DBHandler instances
export const createDBHandler = (MONGODB_URI, databaseName, customLogger) => {
  return new DBHandler(MONGODB_URI, databaseName, customLogger);
};
