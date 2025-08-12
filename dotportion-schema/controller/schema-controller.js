export class SchemaController {
  constructor(schemaService, logger, createResponse) {
    this.schemaService = schemaService;
    this.logger = logger;
    this.createResponse = createResponse;
    this.logger.info(`-->Schema Controller initialized`);
  }

  // Helper method to safely parse JSON body
  parseBody(body) {
    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch (error) {
        this.logger.error(`Error parsing JSON body: ${error}`);
        throw new Error("Invalid JSON in request body");
      }
    }
    return body;
  }

  async createSchema(event) {
    try {
      this.logger.info("-->createSchema Controller Started");
      const body = this.parseBody(event.body);
      const { provider, collection, schema } = body;
      const { tenant, projectId } = event.pathParameters;

      if (!projectId) {
        return this.createResponse(400, { error: "Project ID is required" });
      }

      const result = await this.schemaService.createSchema(
        tenant,
        projectId,
        provider,
        collection,
        schema
      );

      if (result.error) {
        return this.createResponse(400, { error: result.message });
      }

      return this.createResponse(200, { message: "Schema created", result });
    } catch (error) {
      this.logger.error(`Error creating schema: ${error}`);
      return this.createResponse(500, { error: "Internal server error" });
    }
  }

  async getSchema(event) {
    try {
      this.logger.info("-->getSchema Controller Started");
      const { tenant, projectId, collection } = event.pathParameters;
      const { provider } = event.queryStringParameters || {};

      if (!projectId) {
        return this.createResponse(400, { error: "Project ID is required" });
      }

      if (!provider) {
        return this.createResponse(400, { error: "Provider is required" });
      }

      const result = await this.schemaService.getSchema(
        tenant,
        projectId,
        provider,
        collection
      );

      if (result.error) {
        return this.createResponse(400, { error: result.message });
      }

      return this.createResponse(200, { schema: result });
    } catch (error) {
      this.logger.error(`Error getting schema: ${error}`);
      return this.createResponse(500, { error: "Internal server error" });
    }
  }

  async updateSchema(event) {
    try {
      this.logger.info("-->updateSchema Controller Started");
      const body = this.parseBody(event.body);
      const { provider, schema } = body;
      const { tenant, projectId, collection } = event.pathParameters;

      if (!projectId) {
        return this.createResponse(400, { error: "Project ID is required" });
      }

      const result = await this.schemaService.updateSchema(
        tenant,
        projectId,
        provider,
        collection,
        schema
      );

      if (result.error) {
        return this.createResponse(400, { error: result.message });
      }

      return this.createResponse(200, { message: "Schema updated", result });
    } catch (error) {
      this.logger.error(`Error updating schema: ${error}`);
      return this.createResponse(500, { error: "Internal server error" });
    }
  }

  async deleteSchema(event) {
    try {
      this.logger.info("-->deleteSchema Controller Started");
      const { tenant, projectId, collection } = event.pathParameters;
      const { provider } = event.queryStringParameters || {};

      if (!projectId) {
        return this.createResponse(400, { error: "Project ID is required" });
      }

      if (!provider) {
        return this.createResponse(400, { error: "Provider is required" });
      }

      const result = await this.schemaService.deleteSchema(
        tenant,
        projectId,
        provider,
        collection
      );

      if (result.error) {
        return this.createResponse(400, { error: result.message });
      }

      return this.createResponse(200, { message: "Schema deleted", result });
    } catch (error) {
      this.logger.error(`Error deleting schema: ${error}`);
      return this.createResponse(500, { error: "Internal server error" });
    }
  }

  async getAvailableCollections(event) {
    try {
      this.logger.info("-->getAvailableCollections Controller Started");
      const { tenant, projectId } = event.pathParameters;
      const { provider } = event.queryStringParameters || {};

      if (!projectId) {
        return this.createResponse(400, { error: "Project ID is required" });
      }

      if (!provider) {
        return this.createResponse(400, { error: "Provider is required" });
      }

      const result = await this.schemaService.getAvailableCollections(
        tenant,
        projectId,
        provider
      );

      if (result.error) {
        return this.createResponse(400, { error: result.message });
      }

      return this.createResponse(200, { collections: result });
    } catch (error) {
      this.logger.error(`Error getting available collections: ${error}`);
      return this.createResponse(500, { error: "Internal server error" });
    }
  }

  async getCollectionParameters(event) {
    try {
      this.logger.info("-->getCollectionParameters Controller Started");
      const { tenant, projectId, collection } = event.pathParameters;
      const { provider } = event.queryStringParameters || {};

      if (!projectId) {
        return this.createResponse(400, { error: "Project ID is required" });
      }

      if (!provider) {
        return this.createResponse(400, { error: "Provider is required" });
      }

      const result = await this.schemaService.getCollectionParameters(
        tenant,
        projectId,
        provider,
        collection
      );

      if (result.error) {
        return this.createResponse(400, { error: result.message });
      }

      return this.createResponse(200, { collection, parameters: result });
    } catch (error) {
      this.logger.error(`Error getting collection parameters: ${error}`);
      return this.createResponse(500, { error: "Internal server error" });
    }
  }

  async getAllCollectionsWithParameters(event) {
    try {
      this.logger.info("-->getAllCollectionsWithParameters Controller Started");
      const { tenant, projectId } = event.pathParameters;
      const { provider } = event.queryStringParameters || {};

      if (!projectId) {
        return this.createResponse(400, { error: "Project ID is required" });
      }

      if (!provider) {
        return this.createResponse(400, { error: "Provider is required" });
      }

      const result = await this.schemaService.getAllCollectionsWithParameters(
        tenant,
        projectId,
        provider
      );

      if (result.error) {
        return this.createResponse(400, { error: result.message });
      }

      return this.createResponse(200, { collections: result });
    } catch (error) {
      this.logger.error(
        `Error getting all collections with parameters: ${error}`
      );
      return this.createResponse(500, { error: "Internal server error" });
    }
  }
}
