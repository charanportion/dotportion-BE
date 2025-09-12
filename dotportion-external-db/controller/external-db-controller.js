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
}
