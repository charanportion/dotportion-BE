export class UserController {
  constructor(userService, logger, createResponse) {
    this.userService = userService;
    this.logger = logger;
    this.createResponse = createResponse;
    this.logger.info(`-->User Controller initialized`);
  }

  async getCurrentUser(event) {
    try {
      this.logger.info(
        "--> getCurrentUser controller invoked with event:",
        event
      );

      const cognitoSub = event.requestContext.authorizer.claims.sub;

      if (!cognitoSub) {
        this.logger.error(
          "Cognito 'sub' claim not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      const user = await this.userService.findUserByCognitoSub(cognitoSub);

      if (!user) {
        this.logger.warn(
          `User profile not found in DB for cognitoSub: ${cognitoSub}`
        );
        return this.createResponse(404, { message: "User profile not found." });
      }

      return this.createResponse(200, user);
    } catch (error) {
      this.logger.error("Error in getCurrentUser handler:", error);
      return this.createResponse(500, { message: "Internal server error." });
    }
  }
}
