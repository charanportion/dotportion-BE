# DotPortion Dashboard API

This module provides serverless API endpoints for the DotPortion dashboard, offering comprehensive analytics and insights about user activities.

## Overview

The Dashboard API provides:

- Total counts of projects, workflows, secrets, and API calls
- API call trends over time
- Top performing projects and workflows
- Secret distribution by provider
- Success vs failed API calls analysis
- Request method distribution

## API Endpoints

### 1. Get Global Dashboard Data

**GET** `/global`

Retrieves comprehensive dashboard data for the authenticated user.

**Response:**

```json
{
  "counts": {
    "totalProjects": 5,
    "totalWorkflows": 12,
    "totalSecrets": 8,
    "totalApiCalls": 1250,
    "successRate": 95
  },
  "callsOverTime": [
    {
      "date": "2024-01-15",
      "calls": 45
    },
    {
      "date": "2024-01-16",
      "calls": 52
    }
  ],
  "topProjects": [
    {
      "name": "E-commerce API",
      "calls": 450
    },
    {
      "name": "User Management",
      "calls": 320
    }
  ],
  "topWorkflows": [
    {
      "name": "Order Processing",
      "calls": 200
    },
    {
      "name": "User Registration",
      "calls": 150
    }
  ],
  "secretsByProvider": [
    {
      "provider": "mongodb",
      "count": 3
    },
    {
      "provider": "postgresql",
      "count": 2
    }
  ],
  "successVsFailed": {
    "success": 1187,
    "failed": 63
  },
  "requestsByMethod": [
    {
      "method": "GET",
      "count": 600
    },
    {
      "method": "POST",
      "count": 400
    }
  ]
}
```

## Dashboard Data Components

### 1. Counts

- **totalProjects**: Number of projects owned by the user
- **totalWorkflows**: Number of workflows created by the user
- **totalSecrets**: Number of secrets managed by the user
- **totalApiCalls**: Total number of API calls made across all projects
- **successRate**: Percentage of successful API calls

### 2. Calls Over Time

Daily breakdown of API calls for trend analysis.

### 3. Top Projects

Top 5 projects ranked by total API calls.

### 4. Top Workflows

Top 5 workflows ranked by total API calls.

### 5. Secrets by Provider

Distribution of secrets across different database providers.

### 6. Success vs Failed Calls

Breakdown of successful vs failed API calls.

### 7. Requests by Method

Distribution of HTTP methods used in workflows.

## Architecture

The module follows a layered architecture:

1. **Handler** (`get-global-dashboard.js`): Serverless Lambda function entry point
2. **Controller** (`controller/dashboard-controller.js`): Handle HTTP request/response logic
3. **Service** (`service/dashboard-service.js`): Business logic and data aggregation

## Dependencies

- **MongoDB**: For storing and querying dashboard data
- **AWS Lambda**: Serverless execution environment
- **Serverless Framework**: Deployment and configuration
- **Common Layer**: Shared utilities and models

## Testing

Test JSON files are provided in the `test-jsons/` directory. You can use these to test the API locally:

```bash
serverless invoke local --function getGlobalDashboard --path test-jsons/get-global-dashboard.json
```

## Deployment

To deploy the dashboard API:

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

## Authentication

All endpoints require AWS Cognito authentication. The user ID is extracted from the Cognito claims in the request context.

## Data Models Used

- **ProjectModel**: For project-related queries
- **WorkflowModel**: For workflow-related queries
- **LogModel**: For API call logs and analytics
- **SecretModel**: For secret management data

## Performance Considerations

- The dashboard aggregates data from multiple collections
- Uses MongoDB aggregation pipelines for efficient data processing
- Implements parallel processing with Promise.all for better performance
- Caches database connections for optimal performance
