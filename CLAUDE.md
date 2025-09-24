# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Local Development
```bash
# Start local development server for any service
serverless offline --stage dev

# Install dependencies for shared layer
cd layers/common/nodejs && npm install
```

### Testing
```bash
# Test specific Lambda function locally
serverless invoke local --function functionName --path test-jsons/test-event.json

# Test workflow execution
serverless invoke local --function executeWorkflow --path test-jsons/workflow-execution.json
```

### Deployment
```bash
# Deploy to development
serverless deploy --stage dev

# Deploy to production
serverless deploy --stage prod

# Deploy single function
serverless deploy function --function functionName --stage dev
```

### Monitoring
```bash
# View function logs
serverless logs --function functionName --stage dev --tail

# Monitor all functions
serverless logs --stage dev --tail
```

## Architecture Overview

This is a **serverless microservices architecture** with 12 independent AWS Lambda services for DotPortion, a no-code API builder platform. Each service follows a consistent 3-layer architecture pattern.

### Core Services Structure
- **dotportion-user** - User management and authentication
- **dotportion-project** - Project CRUD and analytics
- **dotportion-workflow** - Visual workflow builder
- **dotportion-execution** - Core workflow runtime engine
- **dotportion-realtime** - Real-time execution with WebSocket support
- **dotportion-schema** - Dynamic database schema management
- **dotportion-external-db** - External database connections
- **dotportion-secret** - Encrypted secrets management
- **dotportion-logs-monitoring** - Centralized logging
- **dotportion-dashboard** - Dashboard APIs
- **dotportion-landing** - Landing page APIs
- **dotportion-cognito-auth** - AWS Cognito integration

### Shared Layer
All services depend on `layers/common/nodejs/` which contains:
- **Models**: Mongoose schemas (UserModel, ProjectModel, WorkflowModel, etc.)
- **Utils**: Database connections (`db.js`), logging (`logger.js`), API responses (`api.js`)
- **Common Dependencies**: Shared npm packages across all services

## Service Architecture Pattern

Each service follows this consistent structure:

### Handler Layer (*.js files)
- AWS Lambda entry points with minimal logic
- Delegates to controller layer
- Comprehensive error handling with try-catch

### Controller Layer (controller/)
- HTTP request/response handling
- Input validation and sanitization
- Uses shared `createResponse` utility

### Service Layer (service/)
- Business logic implementation
- Database operations via Mongoose models
- External service integrations

### Example Service Flow
```javascript
// Lambda Handler → Controller → Service → Database
export const handler = async (event) => {
  const service = new ServiceClass(dbHandler, logger, Model);
  const controller = new ControllerClass(service, logger, createResponse);
  return await controller.methodName(event);
};
```

## Database Architecture

### Technology Stack
- **MongoDB** with Mongoose ODM
- **Connection Management**: Centralized via shared `DBHandler` class
- **Multi-tenancy**: Stage-based database separation (dev/prod)
- **Connection Pooling**: Mongoose caching for Lambda efficiency

### Key Data Models
- **ProjectModel**: Projects with CORS, rate limiting, and statistics
- **WorkflowModel**: Visual workflows with nodes, edges, and execution stats
- **UserModel**: User profiles and authentication data
- **SecretModel**: Encrypted environment variables
- **ExecutionLog**: Workflow execution audit trail

### Database Connection Pattern
```javascript
import { createDBHandler } from "/opt/nodejs/utils/db.js";
import ModelName from "/opt/nodejs/models/ModelName.js";

const dbHandler = createDBHandler();
await dbHandler.connectToDatabase();
// Use ModelName for database operations
```

## Workflow Execution Engine

The core execution engine (`dotportion-execution`) supports these node types:
- **API Start Node** - Workflow entry point
- **Parameters Node** - Input validation
- **Logic Node** - Custom JavaScript (sandboxed with vm2)
- **Database Node** - MongoDB CRUD operations
- **JWT Generate/Verify** - Token management
- **Response Node** - HTTP response formatting
- **Condition Node** - Branching logic
- **Loop Node** - Array iteration

### Security Features
- **vm2 Sandbox** - Safe JavaScript execution with 2-second timeout
- **Rate Limiting** - Configurable per project
- **CORS Validation** - Origin-based access control
- **Cognito JWT** - Authentication on all protected endpoints

## API Structure

### Authentication
- **AWS Cognito User Pool**: ap-south-1_25OzAmAmZ
- **JWT Tokens**: Extract user identity from Cognito `sub` claim
- **Protected Routes**: Most endpoints require valid Cognito token

### Base Paths
- `/user/*` - User management
- `/projects/*` - Project management
- `/workflows/*` - Workflow CRUD
- `/api/{tenant}/{projectId}/*` - Workflow execution
- `/schema/{tenant}/{projectId}/*` - Schema management

### Custom Domains
- Dev: `api-dev.dotportion.com`
- Prod: `api.dotportion.com`

## Environment Configuration

### SSM Parameter Store
```bash
/dotportion/{stage}/mongo_uri - MongoDB connection string
```

### Environment Variables
- `MONGO_URI` - SSM parameter reference
- `MDataBase` - Stage name (dev/prod)
- `BASE_URL` - Custom domain URL

## Development Workflow

### Adding New Features
1. Choose appropriate service or create new one
2. Follow 3-layer architecture pattern
3. Add Mongoose model to shared layer if needed
4. Create test JSON files in `test-jsons/`
5. Test locally with `serverless offline`
6. Deploy to dev stage first

### Modifying Existing Services
1. Understand the service's domain responsibility
2. Follow existing patterns in controller/service layers
3. Use shared utilities from common layer
4. Update test files and verify locally
5. Check for breaking changes in dependent services

### Working with the Execution Engine
- Workflow nodes are processed sequentially based on edges
- Each node type has specific input/output requirements
- Logic nodes use vm2 sandbox with limited context
- Database nodes support MongoDB operations with tenant isolation