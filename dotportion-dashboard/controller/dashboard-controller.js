export class DashboardController {
  constructor(dashboardService, logger, createResponse) {
    this.dashboardService = dashboardService;
    this.logger = logger;
    this.createResponse = createResponse;
    this.logger.info(`-->Dashboard Controller initialized`);
  }

  async getDashboardData(event) {
    try {
      this.logger.info("-->getDashboardData Controller Started");

      // const cognitoSub = event.requestContext.authorizer.claims.sub;
      const userId = event.requestContext.authorizer.userId;
      if (!userId) {
        this.logger.error(
          "userId not found in the event. Check authorizer configuration."
        );
        return this.createResponse(403, {
          message: "Forbidden: User identifier not found.",
        });
      }

      const result = await this.dashboardService.getGlobalDashboardData(userId);

      if (result.error) {
        return this.createResponse(400, { error: result.message });
      }

      return this.createResponse(200, result);
    } catch (error) {
      this.logger.error(`Error getting dashboard data: ${error}`);
      return this.createResponse(500, { error: "Internal server error" });
    }
  }
}
