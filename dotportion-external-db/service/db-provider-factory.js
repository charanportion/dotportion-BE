import { MongoProvider } from "./db-providers/mongo-provider.js";

export class DbProviderFactory {
  constructor(logger) {
    this.logger = logger;

    this.logger.info("--> DbProviderFactory initialized");
  }

  createProvider(secret) {
    this.logger.info(`--> Creating provider for type: ${secret.provider}`);

    switch (secret.provider) {
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
