export class NewsLetterService {
  constructor(dbHandler, logger) {
    this.logger = logger;
    this.dbHandler = dbHandler;
    this.collectionName = "newsletters";
    this.logger.info("--> NewsLetterService initialized");
  }

  async subscribe(email) {
    try {
      this.logger.info(`-->subscribe service invoked`);
      const existing = await this.dbHandler.findOne(this.collectionName, {
        email,
      });

      if (existing) {
        if (existing.status === "subscribed") {
          this.logger.warn("Email already exists in the Newsletter:", email);
          return { alreadySubscribed: true, email: existing.email };
        } else if (existing.status === "unsubscribed") {
          // Update status to subscribed and reset emails_sent
          const update = {
            $set: {
              status: "subscribed",
              emails_sent: 0,
            },
          };
          await this.dbHandler.update(this.collectionName, { email }, update);
          return { ...existing, status: "subscribed", emails_sent: 0 };
        }
      }

      const entry = {
        email,
        status: "subscribed",
        emails_sent: 0,
        createdAt: new Date(),
      };
      const result = await this.dbHandler.insert(this.collectionName, entry);

      this.logger.info("Successfully added new email to newsletter:", email);
      return result;
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  async unsubscribe(email) {
    try {
      this.logger.info(`-->unsubscribe service invoked`);
      const existing = await this.dbHandler.findOne(this.collectionName, {
        email,
      });

      if (!existing) {
        this.logger.warn("Email not found in the newsletter list:", email);
        return { error: true, message: "Email not found" };
      }

      if (existing.status === "unsubscribed") {
        this.logger.warn("Email is already unsubscribed", email);
        return { error: true, message: "Email is already unsubscribed" };
      }

      const update = {
        $set: { status: "unsubscribed" },
      };
      const updateResult = await this.dbHandler.update(
        this.collectionName,
        { email },
        update
      );

      if (updateResult.modifiedCount === 0) {
        this.logger.warn("No document was modified during unsubscribe:", email);
        return { error: true, message: "Failed to unsubscribe email" };
      }

      this.logger.info(
        "Successfully unsubscribed email from newsletter:",
        email
      );
      return { ...existing, status: "unsubscribed" };
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  async incrementEmailsSent(email) {
    try {
      const update = { $inc: { emails_sent: 1 } };
      const result = await this.dbHandler.update(
        this.collectionName,
        { email },
        update
      );
      if (!result) throw new Error("Email not found");
      return result;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
