export class SchemaService {
  constructor(dbHandler, logger, SecretModel, MongoSchemaHandler) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.SecretModel = SecretModel;
    this.MongoSchemaHandler = MongoSchemaHandler;
    this.logger.info(`-->Schema Service initialized`);
  }

  async getHandler(provider, secrets) {
    switch (provider) {
      case "mongodb":
        return new this.MongoSchemaHandler(secrets, this.logger);
      default:
        throw Object.assign(new Error("Unsupported provider"), {
          statusCode: 400,
        });
    }
  }

  async getSecretByProvider(tenant, projectId, provider) {
    try {
      await this.dbHandler.connectDb();
      const secret = await this.SecretModel.findOne({
        project: projectId,
        provider,
        tenant,
      });
      return secret;
    } catch (error) {
      this.logger.error("Error getting secret by provider:", error);
      return null;
    }
  }

  async createSchema(tenant, projectId, provider, collection, schema) {
    try {
      this.logger.info(
        `-->createSchema service invoked with projectId: ${projectId}`
      );

      if (!projectId) {
        this.logger.warn("createSchema called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      if (!tenant) {
        this.logger.warn("createSchema called without a tenant.");
        return { error: true, message: "No Tenant" };
      }
      if (!provider) {
        this.logger.warn("createSchema called without a provider.");
        return { error: true, message: "No Provider" };
      }
      if (!collection) {
        this.logger.warn("createSchema called without a collection.");
        return { error: true, message: "No Collection" };
      }
      if (!schema) {
        this.logger.warn("createSchema called without schema.");
        return { error: true, message: "No Schema" };
      }

      const secrets = await this.getSecretByProvider(
        tenant,
        projectId,
        provider
      );
      if (!secrets) {
        return { error: true, message: "Invalid DB secrets" };
      }

      const handler = await this.getHandler(provider, secrets);
      return await handler.createSchema(collection, schema);
    } catch (error) {
      this.logger.error("Error in createSchema service:", error);
      return { error: true, message: "Error creating schema" };
    }
  }

  async getSchema(tenant, projectId, provider, collection) {
    try {
      this.logger.info(
        `-->getSchema service invoked with collection: ${collection}`
      );

      if (!projectId) {
        this.logger.warn("getSchema called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      if (!tenant) {
        this.logger.warn("getSchema called without a tenant.");
        return { error: true, message: "No Tenant" };
      }
      if (!provider) {
        this.logger.warn("getSchema called without a provider.");
        return { error: true, message: "No Provider" };
      }
      if (!collection) {
        this.logger.warn("getSchema called without a collection.");
        return { error: true, message: "No Collection" };
      }

      const secrets = await this.getSecretByProvider(
        tenant,
        projectId,
        provider
      );
      if (!secrets) {
        return { error: true, message: "Invalid DB secrets" };
      }

      const handler = await this.getHandler(provider, secrets);
      return await handler.getSchema(collection);
    } catch (error) {
      this.logger.error("Error in getSchema service:", error);
      return { error: true, message: "Error getting schema" };
    }
  }

  async updateSchema(tenant, projectId, provider, collection, schema) {
    try {
      this.logger.info(
        `-->updateSchema service invoked with collection: ${collection}`
      );

      if (!projectId) {
        this.logger.warn("updateSchema called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      if (!tenant) {
        this.logger.warn("updateSchema called without a tenant.");
        return { error: true, message: "No Tenant" };
      }
      if (!provider) {
        this.logger.warn("updateSchema called without a provider.");
        return { error: true, message: "No Provider" };
      }
      if (!collection) {
        this.logger.warn("updateSchema called without a collection.");
        return { error: true, message: "No Collection" };
      }
      if (!schema) {
        this.logger.warn("updateSchema called without schema.");
        return { error: true, message: "No Schema" };
      }

      const secrets = await this.getSecretByProvider(
        tenant,
        projectId,
        provider
      );
      if (!secrets) {
        return { error: true, message: "Invalid DB secrets" };
      }

      const handler = await this.getHandler(provider, secrets);
      return await handler.updateSchema(collection, schema);
    } catch (error) {
      this.logger.error("Error in updateSchema service:", error);
      return { error: true, message: "Error updating schema" };
    }
  }

  async deleteSchema(tenant, projectId, provider, collection) {
    try {
      this.logger.info(
        `-->deleteSchema service invoked with collection: ${collection}`
      );

      if (!projectId) {
        this.logger.warn("deleteSchema called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      if (!tenant) {
        this.logger.warn("deleteSchema called without a tenant.");
        return { error: true, message: "No Tenant" };
      }
      if (!provider) {
        this.logger.warn("deleteSchema called without a provider.");
        return { error: true, message: "No Provider" };
      }
      if (!collection) {
        this.logger.warn("deleteSchema called without a collection.");
        return { error: true, message: "No Collection" };
      }

      const secrets = await this.getSecretByProvider(
        tenant,
        projectId,
        provider
      );
      if (!secrets) {
        return { error: true, message: "Invalid DB secrets" };
      }

      const handler = await this.getHandler(provider, secrets);
      return await handler.deleteSchema(collection);
    } catch (error) {
      this.logger.error("Error in deleteSchema service:", error);
      return { error: true, message: "Error deleting schema" };
    }
  }

  async getAvailableCollections(tenant, projectId, provider) {
    try {
      this.logger.info(
        `-->getAvailableCollections service invoked with projectId: ${projectId}`
      );

      if (!projectId) {
        this.logger.warn("getAvailableCollections called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      if (!tenant) {
        this.logger.warn("getAvailableCollections called without a tenant.");
        return { error: true, message: "No Tenant" };
      }
      if (!provider) {
        this.logger.warn("getAvailableCollections called without a provider.");
        return { error: true, message: "No Provider" };
      }

      const secrets = await this.getSecretByProvider(
        tenant,
        projectId,
        provider
      );
      if (!secrets) {
        return { error: true, message: "Invalid DB secrets" };
      }

      const handler = await this.getHandler(provider, secrets);
      return await handler.getAvailableCollections();
    } catch (error) {
      this.logger.error("Error in getAvailableCollections service:", error);
      return { error: true, message: "Error getting available collections" };
    }
  }

  async getCollectionParameters(tenant, projectId, provider, collection) {
    try {
      this.logger.info(
        `-->getCollectionParameters service invoked with collection: ${collection}`
      );

      if (!projectId) {
        this.logger.warn("getCollectionParameters called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      if (!tenant) {
        this.logger.warn("getCollectionParameters called without a tenant.");
        return { error: true, message: "No Tenant" };
      }
      if (!provider) {
        this.logger.warn("getCollectionParameters called without a provider.");
        return { error: true, message: "No Provider" };
      }
      if (!collection) {
        this.logger.warn(
          "getCollectionParameters called without a collection."
        );
        return { error: true, message: "No Collection" };
      }

      const secrets = await this.getSecretByProvider(
        tenant,
        projectId,
        provider
      );
      if (!secrets) {
        return { error: true, message: "Invalid DB secrets" };
      }

      const handler = await this.getHandler(provider, secrets);
      return await handler.getCollectionParameters(collection);
    } catch (error) {
      this.logger.error("Error in getCollectionParameters service:", error);
      return { error: true, message: "Error getting collection parameters" };
    }
  }

  async getAllCollectionsWithParameters(tenant, projectId, provider) {
    try {
      this.logger.info(
        `-->getAllCollectionsWithParameters service invoked with projectId: ${projectId}`
      );

      if (!projectId) {
        this.logger.warn(
          "getAllCollectionsWithParameters called without a projectId."
        );
        return { error: true, message: "No Project ID" };
      }
      if (!tenant) {
        this.logger.warn(
          "getAllCollectionsWithParameters called without a tenant."
        );
        return { error: true, message: "No Tenant" };
      }
      if (!provider) {
        this.logger.warn(
          "getAllCollectionsWithParameters called without a provider."
        );
        return { error: true, message: "No Provider" };
      }

      const secrets = await this.getSecretByProvider(
        tenant,
        projectId,
        provider
      );
      if (!secrets) {
        return { error: true, message: "Invalid DB secrets" };
      }

      const handler = await this.getHandler(provider, secrets);
      return await handler.getAllCollectionsWithParameters();
    } catch (error) {
      this.logger.error(
        "Error in getAllCollectionsWithParameters service:",
        error
      );
      return {
        error: true,
        message: "Error getting all collections with parameters",
      };
    }
  }
}
