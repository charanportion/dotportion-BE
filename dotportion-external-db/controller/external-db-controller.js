export class ExternalDbController {
  constructor(secretService, dbProviderFactory, logger, createResponse) {
    this.secretService = secretService;
    this.dbProviderFactory = dbProviderFactory;
    this.logger = logger;
    this.createResponse = createResponse;
    this.logger.info("--> ExternalDbController initialized");
  }

  async _getProvider(cognitoSub, secretId) {
    const secret = await this.secretService.getSecretById(cognitoSub, secretId);
    if (secret.error) {
      return { error: true, message: secret.message, statusCode: 404 };
    }
    this.logger.info(`--> secret: ${JSON.stringify(secret)}`);
    return this.dbProviderFactory.createProvider(secret);
  }

  async _getPlatformProvider(tenant) {
    // Create a mock secret for platform provider
    const platformSecret = {
      provider: "platform",
      data: {}
    };
    return this.dbProviderFactory.createProvider(platformSecret, tenant);
  }

  async getCollections(event) {
    try {
      this.logger.info(`--> event getCollections: ${JSON.stringify(event)}`);
      const { secretId } = event.pathParameters;
      const cognitoSub = event.requestContext.authorizer.claims.sub;

      const provider = await this._getProvider(cognitoSub, secretId);
      if (provider.error) {
        return this.createResponse(provider.statusCode, {
          message: provider.message,
        });
      }

      const collections = await provider.listCollections();
      return this.createResponse(200, collections);
    } catch (error) {
      this.logger.error("Error in getCollections controller:", error);
      return this.createResponse(500, {
        message: "Failed to get collections.",
        error: error.message,
      });
    }
  }

  async getDocuments(event) {
    try {
      const { secretId, collectionName } = event.pathParameters;
      const cognitoSub = event.requestContext.authorizer.claims.sub;
      const { page, limit } = event.queryStringParameters || {};

      const provider = await this._getProvider(cognitoSub, secretId);
      if (provider.error) {
        return this.createResponse(provider.statusCode, {
          message: provider.message,
        });
      }

      const data = await provider.getDocuments(collectionName, { page, limit });
      return this.createResponse(200, data);
    } catch (error) {
      this.logger.error("Error in getDocuments controller:", error);
      return this.createResponse(500, {
        message: "Failed to get documents.",
        error: error.message,
      });
    }
  }

  async createDocument(event) {
    try {
      const { secretId, collectionName } = event.pathParameters;
      const cognitoSub = event.requestContext.authorizer.claims.sub;
      const body =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;

      const provider = await this._getProvider(cognitoSub, secretId);
      if (provider.error) {
        return this.createResponse(provider.statusCode, {
          message: provider.message,
        });
      }

      const newDocument = await provider.createDocument(collectionName, body);
      return this.createResponse(201, newDocument);
    } catch (error) {
      this.logger.error("Error in createDocument controller:", error);
      return this.createResponse(500, {
        message: "Failed to create document.",
        error: error.message,
      });
    }
  }

  async updateDocument(event) {
    try {
      const { secretId, collectionName, documentId } = event.pathParameters;
      const cognitoSub = event.requestContext.authorizer.claims.sub;
      const body =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;

      const provider = await this._getProvider(cognitoSub, secretId);
      if (provider.error) {
        return this.createResponse(provider.statusCode, {
          message: provider.message,
        });
      }

      const updatedDocument = await provider.updateDocument(
        collectionName,
        documentId,
        body
      );
      if (!updatedDocument) {
        return this.createResponse(404, { message: "Document not found." });
      }
      return this.createResponse(200, updatedDocument);
    } catch (error) {
      this.logger.error("Error in updateDocument controller:", error);
      return this.createResponse(500, {
        message: "Failed to update document.",
        error: error.message,
      });
    }
  }

  async deleteDocument(event) {
    try {
      const { secretId, collectionName, documentId } = event.pathParameters;
      const cognitoSub = event.requestContext.authorizer.claims.sub;

      const provider = await this._getProvider(cognitoSub, secretId);
      if (provider.error) {
        return this.createResponse(provider.statusCode, {
          message: provider.message,
        });
      }

      const result = await provider.deleteDocument(collectionName, documentId);
      if (result.deletedCount === 0) {
        return this.createResponse(404, { message: "Document not found." });
      }
      return this.createResponse(200, {
        status: "success",
        message: "document deleted successfully.",
      });
    } catch (error) {
      this.logger.error("Error in deleteDocument controller:", error);
      return this.createResponse(500, {
        message: "Failed to delete document.",
        error: error.message,
      });
    }
  }

  // Platform database methods
  async getPlatformCollections(event) {
    try {
      this.logger.info(`--> event getPlatformCollections: ${JSON.stringify(event)}`);
      const { tenant, projectId } = event.pathParameters;

      if (!tenant || !projectId) {
        return this.createResponse(400, {
          message: "Tenant and projectId are required for platform database access",
        });
      }

      const provider = await this._getPlatformProvider(tenant);
      const collections = await provider.listCollections();

      return this.createResponse(200, {
        collections,
        dbType: 'platform',
        tenant
      });
    } catch (error) {
      this.logger.error("Error in getPlatformCollections controller:", error);
      return this.createResponse(500, {
        message: "Failed to get platform collections.",
        error: error.message,
      });
    }
  }

  async getPlatformDocuments(event) {
    try {
      const { tenant, projectId, collectionName } = event.pathParameters;
      const { page, limit } = event.queryStringParameters || {};

      if (!tenant || !projectId || !collectionName) {
        return this.createResponse(400, {
          message: "Tenant, projectId, and collectionName are required",
        });
      }

      const provider = await this._getPlatformProvider(tenant);
      const data = await provider.getDocuments(collectionName, { page, limit });
      return this.createResponse(200, data);
    } catch (error) {
      this.logger.error("Error in getPlatformDocuments controller:", error);
      return this.createResponse(500, {
        message: "Failed to get platform documents.",
        error: error.message,
      });
    }
  }

  async createPlatformDocument(event) {
    try {
      const { tenant, projectId, collectionName } = event.pathParameters;
      const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;

      if (!tenant || !projectId || !collectionName) {
        return this.createResponse(400, {
          message: "Tenant, projectId, and collectionName are required",
        });
      }

      const provider = await this._getPlatformProvider(tenant);
      const newDocument = await provider.createDocument(collectionName, body);

      if (newDocument.error) {
        return this.createResponse(400, newDocument);
      }

      return this.createResponse(201, newDocument);
    } catch (error) {
      this.logger.error("Error in createPlatformDocument controller:", error);
      return this.createResponse(500, {
        message: "Failed to create platform document.",
        error: error.message,
      });
    }
  }

  async updatePlatformDocument(event) {
    try {
      const { tenant, projectId, collectionName, documentId } = event.pathParameters;
      const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;

      if (!tenant || !projectId || !collectionName || !documentId) {
        return this.createResponse(400, {
          message: "Tenant, projectId, collectionName, and documentId are required",
        });
      }

      const provider = await this._getPlatformProvider(tenant);
      const updatedDocument = await provider.updateDocument(collectionName, documentId, body);

      if (!updatedDocument) {
        return this.createResponse(404, { message: "Document not found in platform database." });
      }

      return this.createResponse(200, updatedDocument);
    } catch (error) {
      this.logger.error("Error in updatePlatformDocument controller:", error);
      return this.createResponse(500, {
        message: "Failed to update platform document.",
        error: error.message,
      });
    }
  }

  async deletePlatformDocument(event) {
    try {
      const { tenant, projectId, collectionName, documentId } = event.pathParameters;

      if (!tenant || !projectId || !collectionName || !documentId) {
        return this.createResponse(400, {
          message: "Tenant, projectId, collectionName, and documentId are required",
        });
      }

      const provider = await this._getPlatformProvider(tenant);
      const result = await provider.deleteDocument(collectionName, documentId);

      if (result.deletedCount === 0) {
        return this.createResponse(404, { message: "Document not found in platform database." });
      }

      return this.createResponse(200, {
        status: "success",
        message: "Platform document deleted successfully.",
        ...result
      });
    } catch (error) {
      this.logger.error("Error in deletePlatformDocument controller:", error);
      return this.createResponse(500, {
        message: "Failed to delete platform document.",
        error: error.message,
      });
    }
  }
}
