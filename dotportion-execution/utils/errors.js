export const ErrorTypes = {
  MISSING_PARAM: "MISSING_PARAM",
  MISSING_PARAMS: "MISSING_PARAMS",
  WORKFLOW_NOT_FOUND: "WORKFLOW_NOT_FOUND",
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  EXECUTION_FAILED: "EXECUTION_FAILED",
  SAVE_FAILED: "SAVE_FAILED",
  FETCH_FAILED: "FETCH_FAILED",
  DELETE_FAILED: "DELETE_FAILED",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  INVALID_INPUT: "INVALID_INPUT",
  UNEXPECTED_PARAMS: "UNEXPECTED_PARAMS",
  PARAMETER_PROCESSING_FAILED: "PARAMETER_PROCESSING_FAILED",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  CORS_ERROR: "CORS_ERROR",
};

export const ErrorMessages = {
  [ErrorTypes.MISSING_PARAM]: "Missing required parameter",
  [ErrorTypes.MISSING_PARAMS]: "Missing required parameters",
  [ErrorTypes.WORKFLOW_NOT_FOUND]: "Workflow not found",
  [ErrorTypes.PROJECT_NOT_FOUND]: "Project not found",
  [ErrorTypes.EXECUTION_FAILED]:
    "Execution failed due to an error in logic node",
  [ErrorTypes.SAVE_FAILED]: "Failed to save workflow",
  [ErrorTypes.FETCH_FAILED]: "Failed to fetch workflow",
  [ErrorTypes.DELETE_FAILED]: "Failed to delete workflow",
  [ErrorTypes.INTERNAL_SERVER_ERROR]: "An unexpected error occurred",
  [ErrorTypes.VALIDATION_FAILED]: "Parameter validation failed",
  [ErrorTypes.INVALID_INPUT]: "Input must be a plain JavaScript object",
  [ErrorTypes.UNEXPECTED_PARAMS]: "Unexpected parameters provided",
  [ErrorTypes.PARAMETER_PROCESSING_FAILED]: "Failed to process parameters",
  [ErrorTypes.RATE_LIMIT_EXCEEDED]:
    "Rate limit exceeded. Please try again later.",
  [ErrorTypes.CORS_ERROR]: "CORS validation failed",
};

export class APIError extends Error {
  constructor(type, message, details = {}) {
    super(message || ErrorMessages[type] || "Unknown error");
    this.type = type;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toResponse() {
    const response = {
      error: this.type,
      message: this.message,
    };

    // Add any additional details
    Object.entries(this.details).forEach(([key, value]) => {
      response[key] = value;
    });

    return response;
  }
}
