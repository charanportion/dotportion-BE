export class SecretService {
  constructor(dbHandler, logger, SecretModel) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.SecretModel = SecretModel;
    this.logger.info(`-->Secret Service initialized`);
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
}
