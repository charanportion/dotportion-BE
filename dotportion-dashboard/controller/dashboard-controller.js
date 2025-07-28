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

      // Extract user ID from Cognito claims
      const cognitoSub = event.requestContext.authorizer.claims.sub;

      if (!cognitoSub) {
        return this.createResponse(401, {
          error: "User ID not found in request",
        });
      }

      const result = await this.dashboardService.getGlobalDashboardData(
        cognitoSub
      );

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
