export class AdminController {
  constructor(adminService, logger, createResponse) {
    this.adminService = adminService;
    this.logger = logger;
    this.createResponse = createResponse;
  }

  async inviteUser(event) {
    try {
      const role = event?.requestContext?.authorizer?.role;

      if (role !== "admin") {
        return this.createResponse(403, {
          error: "You are not authorized. Admin only.",
        });
      }

      const body =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;

      if (!body?.email) {
        return this.createResponse(400, { error: "Email is required." });
      }

      const result = await this.adminService.inviteUser(body.email);

      return this.createResponse(200, result);
    } catch (err) {
      this.logger.error("Admin Invite Error:", err);
      return this.createResponse(500, { error: "Failed to send invite." });
    }
  }
}
