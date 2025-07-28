# DotPortion Schema API

This module provides serverless API endpoints for managing database schemas in the DotPortion platform.

## Overview

The Schema API allows you to:

- Create database schemas for collections
- Retrieve existing schemas
- Update schemas
- Delete schemas and collections
- Get available collections
- Get collection parameters
- Get all collections with their parameters

## API Endpoints

### 1. Create Schema

**POST** `/{tenant}/{projectId}`

Creates a new schema for a collection.

**Request Body:**

```json
{
  "provider": "mongodb",
  "collection": "users",
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
      "min": 0
    },
    "isActive": {
      "type": "Boolean",
      "default": true
    }
  }
}
```

### 2. Get Schema

**GET** `/{tenant}/{projectId}/{collection}?provider=mongodb`

Retrieves the schema for a specific collection.

### 3. Update Schema

**PUT** `/{tenant}/{projectId}/{collection}`

Updates an existing schema for a collection.

**Request Body:**

```json
{
  "provider": "mongodb",
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
    "phone": {
      "type": "String",
      "required": false
    }
  }
}
```

### 4. Delete Schema

**DELETE** `/{tenant}/{projectId}/{collection}?provider=mongodb`

Deletes a schema and its associated collection.

### 5. Get Available Collections

**GET** `/{tenant}/{projectId}/collections/all?provider=mongodb`

Returns a list of all collections that have schemas defined.

### 6. Get Collection Parameters

**GET** `/{tenant}/{projectId}/collections/{collection}/parameters?provider=mongodb`

Returns the parameters/fields for a specific collection.

### 7. Get All Collections with Parameters

**GET** `/{tenant}/{projectId}/collections/parameters?provider=mongodb`

Returns all collections with their respective parameters.

## Schema Field Types

The schema supports the following field types and properties:

- **type**: The data type (String, Number, Boolean, Date, etc.)
- **required**: Boolean indicating if the field is required
- **unique**: Boolean indicating if the field should be unique
- **default**: Default value for the field
- **min**: Minimum value (for numbers)
- **max**: Maximum value (for numbers)
- **enum**: Array of allowed values
- **description**: Field description

## Architecture

The module follows a layered architecture:

1. **Handlers** (`*.js` files): Serverless Lambda function entry points
2. **Controllers** (`controller/schema-controller.js`): Handle HTTP request/response logic
3. **Services** (`service/schema-service.js`): Business logic and data access
4. **Database Handlers** (`service/mongo-schema-handler.js`): Database-specific operations

## Dependencies

- **MongoDB**: For storing schema metadata and collections
- **AWS Lambda**: Serverless execution environment
- **Serverless Framework**: Deployment and configuration
- **Common Layer**: Shared utilities and models

## Testing

Test JSON files are provided in the `test-jsons/` directory for each endpoint. You can use these to test the API locally or in your development environment.

## Deployment

To deploy the schema API:

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

All endpoints require AWS Cognito authentication. The user pool ARN is configured in the `serverless.yml` file.
