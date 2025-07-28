import { ApiHandler } from "./ApiHandler.js";
import { WorkflowExecutor } from "./services/WorkflowExecutor.js"; // Assuming it's a static class
import { WorkflowService } from "./services/WorkflowService.js"; // Assuming a service object/class
import { ProjectService } from "./services/ProjectService.js"; // Assuming a service object/class
import { StatsUpdater } from "./StatsUpdater.js";
import { RateLimiterFactory } from "./RateLimiterFactory.js";

// Initialize all dependencies (singletons)
const statsUpdater = new StatsUpdater();
const rateLimiterFactory = new RateLimiterFactory();
const workflowExecutor = WorkflowExecutor; // Use the static class directly
const workflowService = WorkflowService; // Use the static service directly
const projectService = ProjectService; // Use the static service directly

// Create a single instance of the API handler, injecting dependencies
const apiHandler = new ApiHandler({
  workflowService,
  projectService,
  workflowExecutor,
  statsUpdater,
  rateLimiterFactory,
});

// Export the serverless handler function
export const handler = async (event, context) => {
  // The `event` object would come from your cloud provider's API Gateway
  return apiHandler.handleRequest(event);
};
