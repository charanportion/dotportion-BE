import jwt from "jsonwebtoken";
const { JWT_SECRET } = process.env;
/**
 * Lambda Authorizer for API Gateway
 * Validates JWT tokens from your auth service
 */
export const handler = async (event) => {
  console.log("Authorizer invoked", JSON.stringify(event, null, 2));

  try {
    // Extract token from Authorization header
    const token = event.authorizationToken?.replace("Bearer ", "");

    if (!token) {
      console.log("No token provided");
      throw new Error("Unauthorized");
    }

    // Get JWT secret from environment variable
    const jwtSecret = JWT_SECRET;

    if (!jwtSecret) {
      console.error("JWT_SECRET not configured");
      throw new Error("Configuration error");
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, jwtSecret);
    console.log("Token verified successfully", decoded);

    // Generate IAM policy
    const policy = generatePolicy(
      decoded.userId, // principalId
      "Allow",
      event.methodArn,
      {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
      }
    );

    console.log("Generated policy", JSON.stringify(policy, null, 2));
    return policy;
  } catch (error) {
    console.error("Authorization failed:", error.message);

    // Return explicit deny for invalid tokens
    if (error.name === "TokenExpiredError") {
      throw new Error("Token expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
    }

    throw new Error("Unauthorized");
  }
};

/**
 * Generate IAM policy document
 */
const generatePolicy = (principalId, effect, resource, context = {}) => {
  const authResponse = {
    principalId: principalId,
  };

  if (effect && resource) {
    // Generate wildcard resource to allow all methods and paths
    // This prevents caching issues where only the first endpoint is allowed
    const wildcardResource = generateWildcardResource(resource);

    authResponse.policyDocument = {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: wildcardResource,
        },
      ],
    };
  }

  // Add user context to be available in your Lambda functions
  // This will be available in event.requestContext.authorizer
  if (Object.keys(context).length > 0) {
    authResponse.context = {
      ...context,
      // Context values must be strings, numbers, or booleans
      userId: String(context.userId),
      email: String(context.email),
    };
  }

  return authResponse;
};

const generateWildcardResource = (resource) => {
  // Extract the API Gateway ARN parts
  // Format: arn:aws:execute-api:region:account:api-id/stage/method/path
  const arnParts = resource.split(":");
  const apiGatewayArnPart = arnParts[5]; // api-id/stage/method/path

  if (!apiGatewayArnPart) {
    console.warn("Could not parse resource ARN, using original:", resource);
    return resource;
  }

  const [apiId, stage] = apiGatewayArnPart.split("/");

  // Return wildcard ARN allowing all methods and paths in this stage
  const wildcardArn = `${arnParts.slice(0, 5).join(":")}:${apiId}/${stage}/*/*`;

  console.log("Generated wildcard ARN:", wildcardArn);
  return wildcardArn;
};
