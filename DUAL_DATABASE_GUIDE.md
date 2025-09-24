# Dual Database Support Guide

This document explains the dual database support implemented in both `dotportion-schema` and `dotportion-external-db` services.

## Overview

Both services now support connecting to:
1. **External MongoDB databases** (existing functionality) - user's own databases via stored secrets
2. **Platform MongoDB database** (new functionality) - tenant-isolated platform database

## Architecture Changes

### Schema Service (`dotportion-schema`)

#### Enhanced Components:
- **PlatformSchemaHandler**: Handles schema operations on platform database
- **Enhanced SchemaService**: Routes requests to appropriate handlers based on provider
- **Updated Controllers**: Support both external and platform database operations

#### New Provider Support:
```javascript
// External MongoDB (existing)
provider: "mongodb" // Requires secrets

// Platform MongoDB (new)
provider: "platform" // No secrets required
```

### External-DB Service (`dotportion-external-db`)

#### Enhanced Components:
- **PlatformProvider**: Handles CRUD operations on platform database
- **Enhanced DbProviderFactory**: Creates platform providers
- **Enhanced ExternalDbController**: Supports platform database operations
- **New API Endpoints**: Platform-specific CRUD operations

## API Usage Examples

### Schema Service API

#### Create Schema in Platform Database
```bash
POST /schema/{tenant}/{projectId}/create?provider=platform&collection=users
Content-Type: application/json

{
  "schema": {
    "name": {
      "type": "String",
      "required": true,
      "description": "User's full name"
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
    },
    "role": {
      "type": "String",
      "enum": ["admin", "user", "moderator"],
      "default": "user"
    }
  }
}
```

#### Create Schema in External MongoDB
```bash
POST /schema/{tenant}/{projectId}/create?provider=mongodb&collection=users
Content-Type: application/json

{
  "schema": {
    "name": { "type": "String", "required": true },
    "email": { "type": "String", "required": true }
  }
}
```

#### Get Schema from Platform Database
```bash
GET /schema/{tenant}/{projectId}?provider=platform&collection=users
```

#### Get Schema from External MongoDB
```bash
GET /schema/{tenant}/{projectId}?provider=mongodb&collection=users
```

### External-DB Service API

#### Platform Database Operations

##### Get Platform Collections
```bash
GET /external-db/platform/{tenant}/{projectId}/collections
```

##### Get Platform Documents
```bash
GET /external-db/platform/{tenant}/{projectId}/{collection}/documents?page=1&limit=10
```

##### Create Platform Document
```bash
POST /external-db/platform/{tenant}/{projectId}/{collection}/documents
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30,
  "role": "user"
}
```

##### Update Platform Document
```bash
PUT /external-db/platform/{tenant}/{projectId}/{collection}/documents/{documentId}
Content-Type: application/json

{
  "name": "John Smith",
  "age": 31
}
```

##### Delete Platform Document
```bash
DELETE /external-db/platform/{tenant}/{projectId}/{collection}/documents/{documentId}
```

#### External Database Operations (Existing)
```bash
# These remain unchanged
GET /external-db/{secretId}/collections
GET /external-db/{secretId}/{collection}/documents
POST /external-db/{secretId}/{collection}/documents
PUT /external-db/{secretId}/{collection}/documents/{documentId}
DELETE /external-db/{secretId}/{collection}/documents/{documentId}
```

## Database Structure

### Platform Database
```
Platform MongoDB:
├── dotportion_tenant_user1/
│   ├── test (auto-created)
│   ├── __schema_metadata__ (schema definitions)
│   ├── users (custom collection with schema)
│   └── [other user-defined collections]
├── dotportion_tenant_user2/
│   ├── test (auto-created)
│   ├── __schema_metadata__
│   └── [user-defined collections]
```

### Schema Metadata Structure
```json
{
  "_id": "ObjectId",
  "collection": "users",
  "tenant": "user1",
  "dbType": "platform",
  "createdAt": "2024-01-15T10:00:00Z",
  "schema": {
    "name": {
      "type": "String",
      "required": true
    },
    "email": {
      "type": "String",
      "required": true,
      "unique": true
    }
  }
}
```

### Platform Document Structure
```json
{
  "_id": "ObjectId",
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30,
  "_platformMetadata": {
    "tenant": "user1",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T11:00:00Z",
    "dbType": "platform"
  }
}
```

## Features

### Schema Validation
- **Platform Database**: Automatic schema validation on insert/update operations
- **External Database**: No schema validation (user-controlled)

### Auto-Collection Management
- **Test Collection**: Automatically created for each tenant
- **Custom Collections**: Created automatically if schema exists
- **Schema-less Collections**: Throw error if no schema is defined (except for 'test')

### Tenant Isolation
- **Platform Database**: Complete tenant isolation with separate databases
- **External Database**: User-controlled isolation

### Data Validation
Platform database includes comprehensive validation:
- **Required Field Validation**
- **Type Validation** (string, number, boolean)
- **Range Validation** (min/max for numbers)
- **Enum Validation**
- **Custom Validation Rules**

## Error Handling

### Schema Service Errors
```json
{
  "error": true,
  "message": "Collection already exists in platform database"
}
```

### External-DB Service Errors
```json
{
  "error": true,
  "message": "Platform schema validation failed: Field 'email' is required"
}
```

## Configuration

### Environment Variables
```bash
MONGO_URI=mongodb://platform-connection-string  # Platform database
```

### Provider Types
- `platform`: Uses platform MongoDB with tenant isolation
- `mongodb`: Uses external MongoDB via stored secrets
- `supabase`: Future implementation
- `neondb`: Future implementation

## Integration with Workflow Nodes

Both database node types work seamlessly with the platform database:

### MongoDB Node
- Connects to external user databases
- Uses stored secrets for authentication
- No automatic schema validation

### Database Node
- Connects to platform database automatically
- Uses tenant isolation
- Automatic schema validation
- Auto-creates collections based on schemas

## Testing

### Schema Service Test Files
- `test-jsons/test-platform-schema.json` - Test platform schema creation

### External-DB Service Test Files
- `test-jsons/test-platform-collections.json` - Test platform collections
- `test-jsons/test-platform-data-crud.json` - Test platform CRUD operations

### Testing Commands
```bash
# Schema service
serverless invoke local --function createSchema --path test-jsons/test-platform-schema.json

# External-DB service
serverless invoke local --function getPlatformCollections --path test-jsons/test-platform-collections.json
serverless invoke local --function createPlatformData --path test-jsons/test-platform-data-crud.json
```

## Security Considerations

### Platform Database
- Tenant isolation prevents cross-tenant data access
- No secrets required (uses environment variables)
- Automatic schema validation prevents invalid data

### External Database
- User-controlled security via stored secrets
- No tenant isolation (user responsibility)
- User-controlled validation

## Migration Guide

### Existing Users
- **No breaking changes** - all existing external database functionality preserved
- **New functionality** accessed via `provider=platform` parameter
- **Gradual adoption** - can use both database types simultaneously

### Development Workflow
1. **Create schemas** using schema service with `provider=platform`
2. **Access data** using external-db service platform endpoints
3. **Use in workflows** with Database node type
4. **Monitor and manage** through existing dashboard interfaces

## Best Practices

### Platform Database
- Define schemas before creating collections (except 'test')
- Use descriptive field names and validation rules
- Leverage automatic tenant isolation
- Monitor schema validation errors

### External Database
- Use for existing integrations and external systems
- Manage security and validation manually
- Consider migration to platform database for new projects

This dual database architecture provides flexibility, security, and powerful schema management while maintaining backward compatibility with existing external database integrations.