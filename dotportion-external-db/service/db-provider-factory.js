import { MongoProvider } from "./db-providers/mongo-provider.js";
import { PlatformProvider } from "./db-providers/platform-provider.js";

export class DbProviderFactory {
  constructor(logger) {
    this.logger = logger;

    this.logger.info("--> DbProviderFactory initialized");
  }

  createProvider(secret, tenant = null) {
    this.logger.info(`--> Creating provider for type: ${secret.provider}`);

    switch (secret.provider) {
      case "platform":
        const platformUri = process.env.MONGO_URI;
        if (!platformUri) {
          this.logger.error("Platform MongoDB URI not configured");
          throw new Error("Platform MongoDB URI not configured");
        }
        if (!tenant) {
          this.logger.error("Tenant is required for platform provider");
          throw new Error("Tenant is required for platform provider");
        }
        return new PlatformProvider(platformUri, tenant, this.logger);
      case "mongodb":
        return new MongoProvider(secret.data.uri, this.logger, secret.tenant);
      case "supabase":
        // Future implementation
        // return new SupabaseProvider(decryptedData, this.logger);
        throw new Error("Supabase provider is not yet implemented.");
      case "neondb":
        // Future implementation
        // return new NeonDbProvider(decryptedData, this.logger);
        throw new Error("NeonDB provider is not yet implemented.");
      default:
        this.logger.error(`Unsupported database provider: ${secret.provider}`);
        throw new Error(`Unsupported database provider: ${secret.provider}`);
    }
  }
}
