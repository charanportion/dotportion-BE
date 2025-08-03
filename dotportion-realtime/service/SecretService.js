export class SecretService {
  constructor(dbHandler, logger, SecretModel) {
    this.dbHandler = dbHandler;
    this.logger = logger;
    this.SecretModel = SecretModel;
    this.logger.info(`-->Secret Service initialized`);
  }

  async getSecretByProvider(tenant, projectId, provider) {
    const requestId = `secret_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    try {
      this.logger.info(
        `[${requestId}] -->getSecretByProvider service invoked with tenant: ${tenant}, projectId: ${projectId}, provider: ${provider}`
      );

      this.logger.info(`[${requestId}] Connecting to database...`);
      await this.dbHandler.connectDb();
      this.logger.info(`[${requestId}] Database connected successfully`);

      this.logger.info(`[${requestId}] Querying secret with criteria:`, {
        project: projectId,
        provider,
        tenant,
      });

      const secret = await this.SecretModel.findOne({
        project: projectId,
        provider,
        tenant,
      });

      if (!secret) {
        this.logger.warn(
          `[${requestId}] No secret found for tenant: ${tenant}, projectId: ${projectId}, provider: ${provider}`
        );
        return null;
      }

      this.logger.info(
        `[${requestId}] Secret found for provider: ${provider}`,
        {
          secretId: secret._id,
          provider: secret.provider,
          hasData: !!secret.data,
          dataKeys: secret.data ? Object.keys(secret.data) : [],
        }
      );
      return secret;
    } catch (error) {
      this.logger.error(
        `[${requestId}] Error in getSecretByProvider service:`,
        error
      );
      return null;
    }
  }
}
