export class SecretService {
  constructor(dbHandler, logger, secretModel) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.secretModel = secretModel;
    this.logger.info(`-->Secret Service initialized`);
  }

  async getSecret(projectId, owner, provider) {
    try {
      this.logger.info(
        `-->getSecret service invoked with projectId: ${projectId}, dataBase: ${provider}`
      );
      if (!projectId) {
        this.logger.warn("getSecret called without a projectId.");
        return { error: true, message: "No Project ID" };
      }
      if (!provider) {
        this.logger.warn("getSecret called without a provider.");
        return { error: true, message: "No provider" };
      }
      if (!owner) {
        this.logger.warn("getSecret called without a owner.");
        return { error: true, message: "No user id" };
      }

      await this.dbHandler.connectDb();

      const secret = await this.secretModel.findOne({
        project: projectId,
        provider: provider,
        owner,
      });

      if (!secret) {
        return {
          error: true,
          message: "secret not found or access denied",
        };
      }

      return secret;
    } catch (error) {
      this.logger.error(`Error in getSecret service: ${error}`);
      return { error: true, message: "Error in getSecret" };
    }
  }
}
