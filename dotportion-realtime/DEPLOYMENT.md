# DotPortion Realtime API Deployment Guide

This guide explains how to deploy the DotPortion Realtime API to AWS Lambda and API Gateway.

## Prerequisites

1. **AWS CLI** installed and configured
2. **Serverless Framework** installed globally: `npm install -g serverless`
3. **Node.js 18.x** or higher
4. **AWS Account** with appropriate permissions

## Required AWS Permissions

Your AWS user/role needs the following permissions:

- Lambda: Create, update, delete functions
- API Gateway: Create, update, delete APIs
- IAM: Create roles and policies
- CloudFormation: Create, update, delete stacks
- CloudWatch: Create log groups
- SSM Parameter Store: Read parameters

## Environment Setup

### 1. AWS Credentials

Configure your AWS credentials:

```bash
aws configure
```

### 2. SSM Parameters

Create the required SSM parameters:

```bash
# For dev environment
aws ssm put-parameter \
  --name "/dotportion/dev/mongo_uri" \
  --value "your-mongodb-connection-string" \
  --type "SecureString" \
  --region ap-south-1

# For prod environment
aws ssm put-parameter \
  --name "/dotportion/prod/mongo_uri" \
  --value "your-mongodb-connection-string" \
  --type "SecureString" \
  --region ap-south-1
```

## Deployment

### Quick Deployment

Use the provided deployment script:

```bash
# Deploy to dev environment
./deploy.sh dev

# Deploy to prod environment
./deploy.sh prod
```

### Manual Deployment

```bash
# Install dependencies
npm install

# Deploy to dev
serverless deploy --stage dev

# Deploy to prod
serverless deploy --stage prod
```

## Architecture

The deployment creates the following AWS resources:

### Lambda Functions

- **startWorkflow**: HTTP endpoint to initiate workflow execution
- **connectionManager**: WebSocket connection management
- **defaultHandler**: Default WebSocket message handler
- **orchestrator**: Main workflow execution engine

### API Gateway

- **HTTP API**: REST API for workflow execution
- **WebSocket API**: Real-time communication

### Lambda Layer

- **CommonLayer**: Shared utilities and models

### IAM Roles

- Function-specific roles with minimal required permissions
- CloudWatch logging permissions

## Environment Variables

The following environment variables are automatically configured:

| Variable                     | Description                | Source                   |
| ---------------------------- | -------------------------- | ------------------------ |
| `MONGO_URI`                  | MongoDB connection string  | SSM Parameter Store      |
| `MDataBase`                  | Database name              | Stage name               |
| `WEBSOCKET_API_ID`           | WebSocket API ID           | CloudFormation reference |
| `STAGE`                      | Deployment stage           | Serverless stage         |
| `ORCHESTRATOR_FUNCTION_NAME` | Orchestrator function name | Auto-generated           |
| `AWS_REGION`                 | AWS region                 | Provider configuration   |
| `NODE_ENV`                   | Node environment           | Stage name               |

## Testing

### Local Testing

```bash
# Start local development server
serverless offline

# Test HTTP endpoint
curl -X POST http://localhost:3002/dev/{projectId}/{tenant}/execute \
  -H "Content-Type: application/json" \
  -d '{"workflow": {...}, "input": {...}}'

# Test WebSocket (use a WebSocket client)
ws://localhost:3001
```

### Production Testing

After deployment, test the endpoints using the URLs provided in the deployment output.

## Monitoring

### CloudWatch Logs

Each Lambda function creates its own log group:

- `/aws/lambda/dotportion-realtime-api-dev-startWorkflow`
- `/aws/lambda/dotportion-realtime-api-dev-connectionManager`
- `/aws/lambda/dotportion-realtime-api-dev-orchestrator`

### Metrics

Monitor the following metrics:

- Lambda invocation count and duration
- API Gateway request count and latency
- WebSocket connection count
- Error rates

## Troubleshooting

### Common Issues

1. **Layer not found**: Ensure the common layer is deployed first
2. **SSM parameter not found**: Create the required parameters
3. **IAM permissions**: Check that your user has sufficient permissions
4. **MongoDB connection**: Verify the connection string and network access

### Debug Mode

Enable verbose logging:

```bash
serverless deploy --stage dev --verbose
```

### Rollback

To rollback to a previous deployment:

```bash
serverless rollback --stage dev
```

## Security Considerations

1. **SSM Parameters**: Use SecureString for sensitive data
2. **IAM Roles**: Follow principle of least privilege
3. **API Gateway**: Configure CORS appropriately
4. **WebSocket**: Implement proper authentication
5. **MongoDB**: Use connection string with authentication

## Cost Optimization

1. **Lambda**: Monitor function duration and memory usage
2. **API Gateway**: Consider usage plans for production
3. **WebSocket**: Implement connection cleanup
4. **CloudWatch**: Set up log retention policies

## Support

For issues or questions:

1. Check CloudWatch logs for error details
2. Review the deployment output for configuration issues
3. Verify all prerequisites are met
4. Test locally before deploying to production
