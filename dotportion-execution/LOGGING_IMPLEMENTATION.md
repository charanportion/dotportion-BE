# Workflow Execution Logging Implementation

## Overview

This document describes the comprehensive logging implementation for workflow executions in the dotportion execution service. The logging system tracks the entire lifecycle of workflow executions, including individual node steps, performance metrics, and error handling.

## Implementation Details

### 1. Log Creation (`createLog`)

- **Location**: `dotportion-execution/service/execution-service.js` - `executeWorkflow` method
- **When**: Called at the start of workflow execution
- **Purpose**: Creates an initial log entry and returns a `logId` for tracking

**Request Body Structure** (aligned with user examples):

```json
{
  "project": "631a0b9e8b7c4e2a3f9e4b1a",
  "workflow": "631a0ba88b7c4e2a3f9e4b1c",
  "plan": "default",
  "trigger": {
    "type": "api",
    "request": {
      "method": "POST",
      "path": "/api/v1/users",
      "headers": { "Content-Type": "application/json" },
      "queryParams": { "source": "webapp" },
      "body": { "name": "Jane Doe", "email": "jane.doe@example.com" }
    }
  }
}
```

### 2. Step Logging (`addStep`)

- **Location**: `dotportion-execution/service/WorkflowExecutor.js` - `execute` method
- **When**: Called after each node execution (success or failure)
- **Purpose**: Records individual node execution details and performance metrics

**Success Step Structure** (aligned with user examples):

```json
{
  "stepData": {
    "nodeId": "node_1a2b3c",
    "nodeName": "Fetch User from DB",
    "status": "success",
    "startedAt": "2025-08-10T15:15:10.100Z",
    "finishedAt": "2025-08-10T15:15:10.250Z",
    "durationMs": 150,
    "input": { "userId": "usr_c4d5e6f7" },
    "output": {
      "result": { "user": { "id": "usr_c4d5e7", "name": "Jane Doe" } }
    }
  }
}
```

**Error Step Structure** (aligned with user examples):

```json
{
  "stepData": {
    "nodeId": "node_1a2b3c",
    "nodeName": "Fetch User from DB",
    "status": "error",
    "startedAt": "2025-08-10T15:15:10.100Z",
    "finishedAt": "2025-08-10T15:15:10.100Z",
    "durationMs": 0,
    "error": "Database connection failed"
  }
}
```

### 3. Log Finalization (`finalizeLog`)

- **Location**: `dotportion-execution/service/execution-service.js` - `updateStats` method
- **When**: Called at the end of workflow execution (success or failure)
- **Purpose**: Marks the execution log as complete with final status and response data

**Request Body Structure** (aligned with user examples):

```json
{
  "status": "success",
  "durationMs": 2450,
  "response": {
    "statusCode": 201,
    "body": {
      "message": "User created successfully",
      "userId": "usr_c4d5e6f7"
    }
  }
}
```

## API Endpoints Used

The logging system communicates with the `dotportion-logs-monitoring` service using these endpoints:

1. **Create Log**: `POST /logs/`
2. **Add Step**: `POST /logs/{logId}/steps`
3. **Finalize Log**: `POST /logs/{logId}/finalize`

## Execution Flow

1. **Workflow Execution Starts**

   - `ExecutionController.executeWorkflow()` is called
   - `ExecutionService.executeWorkflow()` creates initial log via `createLog()`
   - `logId` is returned and passed to `WorkflowExecutor.execute()`

2. **Node Execution Loop**

   - For each node in the workflow:
     - Node execution starts (record `startedAt`)
     - Node executes (success or failure)
     - Node execution ends (record `finishedAt` and `durationMs`)
     - `addStep()` is called with step details
     - Move to next node or handle errors

3. **Workflow Execution Ends**
   - `ExecutionService.updateStats()` is called
   - `finalizeLog()` is called with final status and response
   - Log is marked as complete

## Log Data Structures

### Execution Log Fields

- `project`: Project ID
- `workflow`: Workflow ID
- `plan`: User plan (for retention calculation)
- `trigger`: Trigger information (type, request details)
- `status`: Final execution status
- `durationMs`: Total execution time
- `response`: Final response data
- `steps`: Array of node execution steps

### Node Step Fields

- `nodeId`: Unique node identifier
- `nodeName`: Human-readable node name
- `status`: Step status ("success" or "error")
- `startedAt`: ISO timestamp when step started
- `finishedAt`: ISO timestamp when step finished
- `durationMs`: Step execution time in milliseconds
- `input`: Input data for the step
- `output`: Output data from the step (success case)
- `error`: Error message (error case)

## Error Handling

- **Logging Failures**: All logging operations are wrapped in try-catch blocks
- **Non-blocking**: Logging failures do not interrupt workflow execution
- **Graceful Degradation**: If logging service is unavailable, execution continues
- **Error Logging**: Failed logging attempts are logged to console for debugging

## Testing

The logging implementation can be tested by:

1. Executing a workflow through the API
2. Checking the logs service for created log entries
3. Verifying step data is recorded for each node
4. Confirming log finalization occurs

## Configuration

- **API Base URL**: Configured via `BASE_URL` environment variable
- **Default URL**: `https://api-dev.dotportion.com`
- **Service Discovery**: Logs service endpoints are discovered via the base URL

## Future Enhancements

1. **User Plan Integration**: Replace hardcoded "default" plan with actual user plan
2. **Performance Optimization**: Consider batching step logs for high-frequency workflows
3. **Retention Policies**: Implement log retention based on user plans
4. **Real-time Monitoring**: Add real-time log streaming capabilities
5. **Advanced Analytics**: Implement log analysis and reporting features

## Recent Updates

### Alignment with Example Body Structures

The implementation has been updated to match the exact body structures provided by the user:

1. **createLog**: Added `trigger.type` and nested `trigger.request` structure with `queryParams`
2. **finalizeLog**: Structured response with `statusCode` and `body` fields
3. **addStep**: Added `startedAt`/`finishedAt` timestamps and `output` field for success cases

These changes ensure complete compatibility with the expected logging service API contract.
