# DotPortion Execution API

This module provides serverless API endpoints for executing workflows in the DotPortion platform, handling dynamic workflow execution with support for various node types and real-time processing.

## Overview

The Execution API provides:

- Dynamic workflow execution based on HTTP method and path
- Support for multiple node types (API Start, Parameters, Logic, Database, JWT, Response, Condition, Loop)
- Rate limiting and CORS handling
- Real-time statistics tracking
- Comprehensive error handling and logging

## API Endpoints

### 1. Execute Workflow

**ANY** `/{tenant}/{projectId}/{path+}`

Executes a deployed workflow based on the HTTP method and path.

**Path Parameters:**

- `tenant`: The tenant identifier
- `projectId`: The project ID
- `path+`: The workflow path (supports wildcards)

**Request Example:**

```bash
POST /cognito/68836caf709af61cf2013959/api/users
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30
}
```

**Response Example:**

```json
{
  "status": 200,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

## Workflow Node Types

### 1. API Start Node

- Entry point for workflow execution
- Defines initial data structure

### 2. Parameters Node

- Validates and processes input parameters
- Supports multiple sources (params, body, query, headers)
- Configurable validation rules

### 3. Logic Node

- Executes custom JavaScript code
- Sandboxed execution environment
- Access to input data and context

### 4. Database Node

- Performs database operations (CRUD)
- Supports MongoDB operations
- Dynamic value replacement

### 5. JWT Generate Node

- Generates JWT tokens
- Configurable payload and expiration

### 6. JWT Verify Node

- Verifies JWT tokens
- Extracts and validates claims

### 7. Response Node

- Formats final response
- Sets HTTP status codes

### 8. Condition Node

- Implements conditional logic
- Supports branching workflows

### 9. Loop Node

- Iterates over collections
- Supports array processing

## Architecture

The module follows a clean, layered architecture:

1. **Handler** (`execute-workflow.js`): Serverless Lambda function entry point
2. **Controller** (`controller/execution-controller.js`): HTTP request/response handling
3. **Service** (`service/execution-service.js`): Business logic and workflow management
4. **WorkflowExecutor** (`service/WorkflowExecutor.js`): Core workflow execution engine
5. **Utilities**: Rate limiting, stats tracking, CORS handling

## Features

### Rate Limiting

- Configurable rate limits per project
- In-memory rate limiting (Redis recommended for production)
- Customizable error messages

### CORS Support

- Configurable CORS settings per project
- Pre-flight request handling
- Origin validation

### Statistics Tracking

- Real-time API call tracking
- Success/failure rate monitoring
- Response time analytics
- Project and workflow statistics

### Error Handling

- Comprehensive error types
- Detailed error messages
- Graceful error recovery
- Centralized error formatting

## Dependencies

- **MongoDB**: For workflow and project data
- **vm2**: For sandboxed JavaScript execution
- **jsonwebtoken**: For JWT operations
- **express-rate-limit**: For rate limiting
- **AWS Lambda**: Serverless execution environment

## Testing

Test JSON files are provided in the `test-jsons/` directory:

```bash
# Test workflow execution
serverless invoke local --function executeWorkflow --path test-jsons/execute-workflow.json
```

## Deployment

To deploy the execution API:

```bash
# Install dependencies
npm install

# Deploy to development
serverless deploy --stage dev

# Deploy to production
serverless deploy --stage prod
```

## Environment Variables

- `MONGO_URI`: MongoDB connection string
- `MDataBase`: Database name
- `BASE_URL`: Base URL for the API

## Security Considerations

### Sandboxed Execution

- JavaScript code execution is sandboxed using vm2
- Limited access to Node.js APIs
- Timeout protection (2 seconds default)

### Rate Limiting

- Prevents abuse and ensures fair usage
- Configurable per project
- IP-based limiting

### CORS Protection

- Origin validation
- Configurable allowed origins
- Method and header restrictions

## Performance Optimizations

- Database connection pooling
- Parallel workflow execution where possible
- Efficient MongoDB queries
- Minimal memory footprint

## Monitoring and Logging

- Comprehensive logging at all levels
- Performance metrics tracking
- Error monitoring and alerting
- Request/response logging

## Error Types

- `MISSING_PARAMS`: Required parameters missing
- `WORKFLOW_NOT_FOUND`: Workflow not found or not deployed
- `EXECUTION_FAILED`: Workflow execution error
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `CORS_ERROR`: CORS validation failed
- `PROJECT_NOT_FOUND`: Project not found

## Usage Examples

### Simple API Call

```bash
curl -X POST https://api.dotportion.com/execution/cognito/project123/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```

### With Query Parameters

```bash
curl -X GET "https://api.dotportion.com/execution/cognito/project123/api/users?limit=10&page=1" \
  -H "Authorization: Bearer <token>"
```

### Complex Workflow

Workflows can be chained with multiple nodes:

1. API Start → Parameters → JWT Verify → Database → Logic → Response

This architecture provides a robust, scalable, and secure workflow execution system for the DotPortion platform.
