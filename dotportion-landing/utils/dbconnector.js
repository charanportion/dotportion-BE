import { MongoClient, ObjectId } from "mongodb";

export class DBHandler {
  constructor(MONGODB_URI, MDataBase, logger) {
    this.client = null;
    this.cacheDb = null;
    this.mongodbURI = MONGODB_URI;
    this.mDataBase = MDataBase;
    this.logger = logger;
    this.logger.info(`-->DBHandler initialized`);
    this.logger.info(`-->DBHandler mongodbURI: ${this.mongodbURI}`);
    this.logger.info(`-->DBHandler MDataBase: ${this.mDataBase}`);
  }

  async connectDb() {
    this.logger.info(`--> connect ${this.mongodbURI}`);
    try {
      if (this.cacheDb) {
        return this.cacheDb;
      }
      if (!this.mongodbURI) {
        this.logger.warn("Mongodb connection string not found.");
        return null;
      }

      this.logger.info(`--> Creating new client: ${this.mongodbURI}`);
      this.client = new MongoClient(this.mongodbURI, {
        serverSelectionTimeoutMS: 10000, // 10 seconds
        connectTimeoutMS: 10000, // 10 seconds
        socketTimeoutMS: 45000, // 45 seconds
      });
      const connection = await this.client.connect();
      this.logger.info(`<--Created new client: ${this.mongodbURI}`);

      this.logger.info(`--> Connect with DB: ${this.mDataBase}`);
      const db = connection.db(this.mDataBase);
      this.logger.info(`<-- Connect with DB: ${this.mDataBase}`);
      this.cacheDb = db;
      this.logger.info(`<-- Connected to DB: ${this.mDataBase}`);
      return db;
    } catch (error) {
      this.logger.error({ error, errorFrom: "DB Connection failed." });
      throw error;
    }
  }

  async fetch(collection, query, skip, pageSize) {
    try {
      this.logger.info(
        `--> fetch ${collection} : ${query} ${skip} ${pageSize}`
      );
      const db = await this.connectDb();
      const dbCollection = db.collection(collection);
      const data = await dbCollection
        .find(query)
        .skip(skip)
        .limit(pageSize)
        .toArray();
      this.logger.info(`<-- fetch ${collection}`);
      return { jobs: data, totalCount: data?.length };
    } catch (error) {
      this.logger.error(`Error in fetch ${data}:`, {
        error: error.message,
      });
      throw error;
    } finally {
      this.logger.info(`closed fetch ${collection}`);
    }
  }

  async findOne(collectionName, query) {
    this.logger.info(
      `--> findOne ${collectionName} : ${JSON.stringify(query)}`
    );
    try {
      const db = await this.connectDb();
      const collection = db.collection(collectionName);
      const result = await collection.findOne(query);
      this.logger.info(`<-- findOne ${collectionName}`);
      return result;
    } catch (error) {
      this.logger.error(`Error in findOne ${collectionName}:`, {
        error: error.message,
      });
      throw error;
    }
  }

  async insert(collectionName, document) {
    this.logger.info(
      `--> insert ${collectionName} : ${JSON.stringify(document)}`
    );
    try {
      const db = await this.connectDb();
      const collection = db.collection(collectionName);
      const result = await collection.insertOne(document);
      this.logger.info(`<-- insert ${collectionName}`);
      return result;
    } catch (error) {
      this.logger.error(`Error in insert ${collectionName}: ${error}`);
      throw error;
    }
  }
  async search(collectionName, jobTitle, skip = 0, pageSize = 10) {
    this.logger.info(`--> Searching for job title: ${jobTitle}`);
    try {
      const db = await this.connectDb();
      const collection = db.collection(collectionName);
      const query = { jobTitle: { $regex: jobTitle, $options: "i" } };
      const result = await collection
        .find(query)
        .skip(skip)
        .limit(pageSize)
        .project({ _id: 1, jobTitle: 1 })
        .toArray();
      this.logger.info(
        `<-- Search results for job title: ${jobTitle}: ${JSON.stringify(
          result
        )}`
      );
      return result;
    } catch (error) {
      this.logger.error(`Error in search for job title ${jobTitle}:`, {
        error: error.message,
      });
      throw error;
    }
  }

  async fetchAll(collection) {
    try {
      this.logger.info(`--> fetchAll ${collection}`);
      const db = await this.connectDb();
      const dbCollection = db.collection(collection);
      const data = await dbCollection.find().toArray();
      this.logger.info(`<-- fetchAll ${JSON.stringify(data)}`);
      return { data, totalCount: data?.length };
    } catch (error) {
      this.logger.error(`Error in fetchAll ${collection}:`, {
        error: error.message,
      });
      throw error;
    } finally {
      this.logger.info(`closed fetchAll ${collection}`);
    }
  }
  async findById(collectionName, id) {
    this.logger.info(`--> Searching for job template with id: ${id}`);
    try {
      const db = await this.connectDb();
      const collection = db.collection(collectionName);
      const result = await collection.findOne({ _id: new ObjectId(id) });
      this.logger.info(
        `<-- Search result for id ${id}: ${JSON.stringify(result)}`
      );
      return result;
    } catch (error) {
      this.logger.error(`Error in search for id ${id}:`, {
        error: error.message,
      });
      throw error;
    }
  }

  async update(collectionName, query, updateData) {
    this.logger.info(
      `--> update ${collectionName}: ${JSON.stringify(updateData)}`
    );
    try {
      const db = await this.connectDb();
      const collection = db.collection(collectionName);
      // Ensure updateData uses $set operator for non-atomic updates
      const updateOperation = updateData.$set
        ? updateData
        : { $set: updateData };
      const result = await collection.updateOne(query, updateOperation);
      this.logger.info(`<-- update ${collectionName} completed`);
      return result;
    } catch (error) {
      this.logger.error(`Error in update ${collectionName}: ${error.message}`);
      throw error;
    }
  }

  async aggregate(collectionName, pipeline) {
    this.logger.info(
      `--> aggregate ${collectionName} with pipeline: ${JSON.stringify(
        pipeline
      )}`
    );
    try {
      const db = await this.connectDb();
      const collection = db.collection(collectionName);
      const result = await collection.aggregate(pipeline).toArray();
      this.logger.info(
        `<-- aggregate ${collectionName} found ${result.length} documents`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error in aggregate ${collectionName}: ${error.message}`
      );
      throw error;
    }
  }

  async updateOne(collectionName, filter, updateData) {
    this.logger.info(
      `--> updateOne ${collectionName}: filter: ${JSON.stringify(
        filter
      )}, update: ${JSON.stringify(updateData)}`
    );
    try {
      const db = await this.connectDb();
      const collection = db.collection(collectionName);
      const result = await collection.updateOne(filter, updateData);
      this.logger.info(`<-- updateOne ${collectionName} completed`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error in updateOne ${collectionName}: ${error.message}`
      );
      throw error;
    }
  }
  async deleteOne(collectionName, filter) {
    this.logger.info(
      `--> deleteOne ${collectionName}: filter: ${JSON.stringify(filter)}`
    );
    try {
      const db = await this.connectDb();
      const collection = db.collection(collectionName);
      const result = await collection.deleteOne(filter);
      this.logger.info(`<-- deleteOne ${collectionName} completed`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error in deleteOne ${collectionName}: ${error.message}`
      );
      throw error;
    }
  }

  async find(collectionName, query, options = {}) {
    this.logger.info(
      `--> find ${collectionName}: ${JSON.stringify(
        query
      )}, options: ${JSON.stringify(options)}`
    );
    try {
      const db = await this.connectDb();
      const collection = db.collection(collectionName);
      let findQuery = collection.find(query);

      if (options.sort) {
        findQuery = findQuery.sort(options.sort);
      }

      const result = await findQuery.toArray();
      this.logger.info(`<-- finds result: ${JSON.stringify(result)} completed`);
      this.logger.info(`<-- find ${collectionName} completed`);
      return result;
    } catch (error) {
      this.logger.error(`Error in find ${collectionName}: ${error.message}`);
      throw error;
    }
  }
  async findOneAndUpdate(collectionName, filter, updateData, options = {}) {
    this.logger.info(
      `--> findOneAndUpdate ${collectionName}: filter: ${JSON.stringify(
        filter
      )}, update: ${JSON.stringify(updateData)}`
    );
    try {
      const db = await this.connectDb();
      const collection = db.collection(collectionName);
      const result = await collection.findOneAndUpdate(filter, updateData, {
        returnDocument: "after", // Return the updated document
        ...options, // Spread any additional options
      });
      this.logger.info(`<-- findOneAndUpdate ${collectionName} completed`);
      return result.value; // Return the updated document
    } catch (error) {
      this.logger.error(
        `Error in findOneAndUpdate ${collectionName}: ${error.message}`
      );
      throw error;
    }
  }
}
