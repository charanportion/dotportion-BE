export class WaitlistService {
  constructor(dbHandler, logger) {
    this.logger = logger;
    this.dbHandler = dbHandler;
    this.collectionName = "waitlists";
    this.logger.info("--> WaitlistService initialized");
  }
  async addWaitlist(email) {
    try {
      this.logger.info(`-->addWaitlist service invoked`);
      const existing = await this.dbHandler.findOne(this.collectionName, {
        email,
      });
      if (existing) {
        this.logger.warn("Email already exists in the waitlist:", email);
        return { alreadySubscribed: true, email: existing.email };
      }

      // const entry = new WaitList({ email, status: "approved" });
      const entry = { email, status: "approved", createdAt: new Date() };
      const result = await this.dbHandler.insert(this.collectionName, entry);

      this.logger.info("Successfully added new email to waitlist:", email);

      return result;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
