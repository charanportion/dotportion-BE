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

  async replaceAllCollections(tenant, collectionsArray) {
    try {
      await this.connect(tenant);
      this.logger.info(
        `Replacing all collections for tenant: ${tenant} in platform database`
      );

      // Step 1: Get all existing collections
      const existingCollections = await this.db
        .collection("__schema_metadata__")
        .find({ tenant })
        .toArray();

      this.logger.info(
        `Found ${existingCollections.length} existing collections to delete`
      );

      // Step 2: Delete all existing collections and their metadata
      for (const doc of existingCollections) {
        const collectionName = doc.collection;
        this.logger.info(
          `Deleting collection: ${collectionName} from platform database`
        );

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
          .deleteOne({ collection: collectionName, tenant });
        this.logger.info(`Deleted metadata for collection: ${collectionName}`);
      }

      // Step 3: Create new collections from the provided array
      const createdCollections = [];
      for (const item of collectionsArray) {
        const { collection, schema } = item;
        this.logger.info(
          `Creating new collection: ${collection} in platform database`
        );

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
        dbType: "platform",
      };
    } catch (error) {
      this.logger.error(
        "Error in replaceAllCollections for platform database:",
        error
      );
      await this.close();
      throw error;
    }
  }
}
