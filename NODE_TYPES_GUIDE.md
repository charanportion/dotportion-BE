# Database Node Types Guide

This document explains the differences between the **MongoDB Node** and **Database Node** types in the DotPortion workflow execution engine.

## Overview

With the recent refactoring, we now have two distinct database node types:

1. **MongoDB Node** (`mongodb`) - Connects to external MongoDB databases
2. **Database Node** (`database`) - Connects to the platform's internal MongoDB with tenant isolation

## MongoDB Node

### Purpose
Connects to user's own external MongoDB database using stored secrets.

### Features
- Uses user-provided MongoDB connection strings
- Connects to external databases outside the platform
- Requires secrets to be configured in the project
- Full control over database structure and collections
- No schema validation by the platform

### Configuration
```json
{
  "id": "mongodb-1",
  "type": "mongodb",
  "data": {
    "collection": "users",
    "provider": "mongodb",  // References the secret provider
    "operation": "insertOne",
    "data": {
      "name": "{{input.name}}",
      "email": "{{input.email}}"
    },
    "query": {
      "email": "{{input.email}}"
    },
    "options": {
      "limit": 10
    }
  }
}
```

### Requirements
- Secret must be configured in the project with provider name "mongodb"
- Secret data must contain:
  ```json
  {
    "uri": "mongodb://connection-string",
    "tenant": "database-name"
  }
  ```

### Supported Operations
- `findOne` - Find a single document
- `findMany` - Find multiple documents
- `insertOne` - Insert a single document
- `insertMany` - Insert multiple documents
- `updateOne` - Update a single document
- `updateMany` - Update multiple documents
- `deleteOne` - Delete a single document
- `deleteMany` - Delete multiple documents

## Database Node

### Purpose
Connects to the platform's internal MongoDB with tenant-specific database isolation.

### Features
- Uses platform's MongoDB connection
- Tenant-isolated databases (`dotportion_tenant_{tenantName}`)
- Auto-creates "test" collection for each tenant
- Schema validation integration
- No external secrets required

### Configuration
```json
{
  "id": "database-1",
  "type": "database",
  "data": {
    "collection": "test",  // or any collection with defined schema
    "operation": "insertOne",
    "data": {
      "message": "{{input.message}}",
      "userId": "{{input.userId}}"
    },
    "query": {
      "userId": "{{input.userId}}"
    },
    "options": {
      "limit": 10
    }
  }
}
```

### Database Structure
```
Platform MongoDB:
├── dotportion_tenant_user1/
│   ├── test (auto-created)
│   ├── __schema_metadata__ (schema definitions)
│   └── [user-defined collections based on schemas]
└── dotportion_tenant_user2/
    ├── test (auto-created)
    ├── __schema_metadata__
    └── [user-defined collections based on schemas]
```

### Schema Integration
- Collections other than "test" require schemas to be defined
- Schemas are managed through the `dotportion-schema` service
- Data validation occurs automatically based on schema rules
- Schema validation includes:
  - Required field validation
  - Type validation (string, number, boolean)
  - Range validation (min/max for numbers)
  - Enum validation
  - Custom validation rules

### Auto-Collection Creation
- **"test" collection**: Created automatically on first access
- **Custom collections**: Created automatically if schema exists
- **Schema-less collections**: Throw error if no schema is defined

### Supported Operations
Same as MongoDB node:
- `findOne`, `findMany`
- `insertOne`, `insertMany` (with schema validation)
- `updateOne`, `updateMany` (with schema validation)
- `deleteOne`, `deleteMany`

## Comparison Table

| Feature | MongoDB Node | Database Node |
|---------|-------------|---------------|
| **Connection** | External MongoDB | Platform MongoDB |
| **Database** | User-controlled | Tenant-isolated |
| **Secrets Required** | Yes | No |
| **Schema Validation** | No | Yes |
| **Collection Creation** | Manual | Auto (test) / Schema-based |
| **Tenant Isolation** | No | Yes |
| **Use Case** | External integrations | Platform features |

## Migration Guide

### Breaking Change Notice
If you have existing workflows using the "database" node type expecting external MongoDB connectivity, you need to:

1. **Update node type** from "database" to "mongodb"
2. **Ensure secrets are properly configured** with the "mongodb" provider
3. **Test workflow functionality** after the change

### Example Migration
**Before (Old Database Node):**
```json
{
  "type": "database",
  "data": {
    "collection": "users",
    "provider": "mongodb",
    "operation": "findOne"
  }
}
```

**After (MongoDB Node):**
```json
{
  "type": "mongodb",
  "data": {
    "collection": "users",
    "provider": "mongodb",
    "operation": "findOne"
  }
}
```

## Schema Management for Database Node

To use custom collections with the Database node:

1. **Create Schema** using the schema service:
   ```bash
   POST /schema/{tenant}/{projectId}/create
   ```

2. **Define Collection Structure**:
   ```json
   {
     "collectionName": "users",
     "schema": {
       "name": {
         "type": "String",
         "required": true
       },
       "email": {
         "type": "String",
         "required": true,
         "unique": true
       },
       "age": {
         "type": "Number",
         "min": 18,
         "max": 100
       }
     }
   }
   ```

3. **Use in Database Node**:
   ```json
   {
     "type": "database",
     "data": {
       "collection": "users",
       "operation": "insertOne",
       "data": {
         "name": "{{input.name}}",
         "email": "{{input.email}}",
         "age": "{{input.age}}"
       }
     }
   }
   ```

## Error Handling

### MongoDB Node Errors
- Missing or invalid secrets
- External database connectivity issues
- MongoDB operation errors
- Authentication failures

### Database Node Errors
- Platform database connectivity issues
- Schema validation failures
- Missing collection schema (for non-test collections)
- MongoDB operation errors

## Best Practices

### MongoDB Node
- Use for external system integrations
- Ensure proper secret management
- Handle connection errors gracefully
- Consider external database performance

### Database Node
- Use for platform-specific features
- Define schemas for data consistency
- Use "test" collection for simple operations
- Leverage automatic schema validation

## Testing

Test files are available in:
- `dotportion-execution/test-jsons/test-mongodb-node.json`
- `dotportion-execution/test-jsons/test-database-node.json`
- `dotportion-realtime/test-jsons/test-database-node-realtime.json`

These test files demonstrate proper usage of both node types in different scenarios.