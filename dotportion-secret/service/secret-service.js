export class SecretService {
  constructor(dbHandler, logger, SecretModel) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.SecretModel = SecretModel;
    this.logger.info(`-->Secret Service initialized`);
  }

  async createSecret(tenant, cognitoSub, projectId, secretData) {
    try {
      this.logger.info(
        `-->createSecret service invoked with projectId:`,
        projectId
      );
      if (!projectId) {
        this.logger.warn("createSecret called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      if (!cognitoSub) {
        this.logger.warn("createSecret called without a cognitoSub.");
        return { error: true, message: "No Owner Data" };
      }
      if (!tenant) {
        this.logger.warn("createSecret called without a tenant.");
        return { error: true, message: "No Tenant" };
      }
      if (!secretData) {
        this.logger.warn("createSecret called without secretData.");
        return { error: true, message: "No Secret Data" };
      }

      await this.dbHandler.connectDb();
      // Check if secret with same provider already exists for this project
      const existingSecret = await this.SecretModel.findOne({
        project: projectId,
        provider: secretData.provider,
      });

      if (existingSecret) {
        return {
          error: true,
          message: `A secret with provider ${secretData.provider} already exists for this project`,
        };
      }

      const secret = await this.SecretModel.create({
        tenant,
        owner: cognitoSub,
        project: projectId,
        provider: secretData.provider,
        data: secretData.data,
      });

      return secret;
    } catch (error) {
      this.logger.error("Error in createSecret service:", error);
      return { error: true, message: "Error creating secret" };
    }
  }

  async getProjectSecrets(cognitoSub, projectId) {
    try {
      this.logger.info(
        `-->getProjectSecrets service invoked with projectId:`,
        projectId
      );
      if (!projectId) {
        this.logger.warn("getProjectSecrets called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      if (!cognitoSub) {
        this.logger.warn("getProjectSecrets called without a cognitoSub.");
        return { error: true, message: "No Owner Data" };
      }

      await this.dbHandler.connectDb();

      const secrets = await this.SecretModel.find({ project: projectId });
      return secrets;
    } catch (error) {
      this.logger.error("Error in getProjectSecrets service:", error);
      return { error: true, message: "Error getting project secrets" };
    }
  }

  async getSecretById(cognitoSub, secretId) {
    try {
      this.logger.info(
        `-->getSecretById service invoked with secretId:`,
        secretId
      );
      if (!secretId) {
        this.logger.warn("getSecretById called without a secretId.");
        return { error: true, message: "No Secret ID" };
      }
      if (!cognitoSub) {
        this.logger.warn("getSecretById called without a cognitoSub.");
        return { error: true, message: "No Owner Data" };
      }

      await this.dbHandler.connectDb();

      const secret = await this.SecretModel.findOne({
        _id: secretId,
        owner: cognitoSub,
      });

      if (!secret) {
        return { error: true, message: "Secret not found" };
      }
      return secret;
    } catch (error) {
      this.logger.error("Error in getSecretById service:", error);
      return { error: true, message: "Error getting secret by ID" };
    }
  }

  async updateSecret(cognitoSub, secretId, updateData) {
    try {
      this.logger.info(
        `-->updateSecret service invoked with secretId:`,
        secretId
      );
      if (!secretId) {
        this.logger.warn("updateSecret called without a secretId.");
        return { error: true, message: "No Secret ID" };
      }
      if (!cognitoSub) {
        this.logger.warn("updateSecret called without a cognitoSub.");
        return { error: true, message: "No Owner Data" };
      }
      if (!updateData) {
        this.logger.warn("updateSecret called without updateData.");
        return { error: true, message: "No Update Data" };
      }

      await this.dbHandler.connectDb();

      const secret = await this.SecretModel.findOneAndUpdate(
        { _id: secretId },
        { $set: { data: updateData.data } },
        { new: true, runValidators: true }
      );

      if (!secret) {
        return { error: true, message: "Secret not found" };
      }

      return secret;
    } catch (error) {
      this.logger.error("Error in updateSecret service:", error);
      return { error: true, message: "Error updating secret" };
    }
  }

  async deleteSecret(cognitoSub, secretId) {
    try {
      this.logger.info(
        `-->deleteSecret service invoked with secretId:`,
        secretId
      );
      if (!secretId) {
        this.logger.warn("deleteSecret called without a secretId.");
        return { error: true, message: "No Secret ID" };
      }
      if (!cognitoSub) {
        this.logger.warn("deleteSecret called without a cognitoSub.");
        return { error: true, message: "No Owner Data" };
      }

      await this.dbHandler.connectDb();

      const secret = await this.SecretModel.findOneAndDelete({
        _id: secretId,
        owner: cognitoSub,
      });

      if (!secret) {
        return { error: true, message: "Secret not found" };
      }

      return secret;
    } catch (error) {
      this.logger.error("Error in deleteSecret service:", error);
      return { error: true, message: "Error deleting secret" };
    }
  }

  async getSecretByProvider(tenant, projectId, provider) {
    try {
      this.logger.info(
        `-->getSecretByProvider service invoked with provider:`,
        provider
      );
      if (!projectId) {
        this.logger.warn("getSecretByProvider called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      if (!provider) {
        this.logger.warn("getSecretByProvider called without a provider.");
        return { error: true, message: "No Provider" };
      }
      if (!tenant) {
        this.logger.warn("getSecretByProvider called without a tenant.");
        return { error: true, message: "No Tenant" };
      }

      await this.dbHandler.connectDb();

      const secret = await this.SecretModel.findOne({
        project: projectId,
        provider,
        tenant,
      });

      if (!secret) {
        return { error: true, message: "Secret not found" };
      }
      return secret;
    } catch (error) {
      this.logger.error("Error in getSecretByProvider service:", error);
      return { error: true, message: "Error getting secret by provider" };
    }
  }
}
