import { handler } from "./execute-workflow.js";

// Test event similar to the one in test-jsons/execute-workflow.json
const testEvent = {
  requestContext: {
    authorizer: {
      claims: {
        sub: "51830d0a-c0d1-70e3-bf3d-c5f39af7033b",
        email: "cognito@yopmail.com",
        name: "cognito",
      },
    },
    identity: {
      sourceIp: "127.0.0.1",
    },
  },
  httpMethod: "POST",
  pathParameters: {
    tenant: "cognito",
    projectId: "68836caf709af61cf2013959",
    path: "create-user",
  },
  queryStringParameters: {
    limit: "10",
    page: "1",
  },
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    origin: "https://example.com",
  },
  body: '{"name":"John Doe","email":"john@example.com","age":30}',
};

async function testExecution() {
  console.log("=== Starting Execution Test ===");
  console.log("Test event:", JSON.stringify(testEvent, null, 2));

  try {
    const result = await handler(testEvent);
    console.log("=== Execution Result ===");
    console.log("Status Code:", result.statusCode);
    console.log("Headers:", result.headers);
    console.log("Body:", result.body);

    if (result.body) {
      try {
        const parsedBody = JSON.parse(result.body);
        console.log("Parsed Body:", JSON.stringify(parsedBody, null, 2));
      } catch (e) {
        console.log("Could not parse body as JSON");
      }
    }
  } catch (error) {
    console.error("=== Execution Failed ===");
    console.error("Error:", error);
    console.error("Stack:", error.stack);
  }
}

// Run the test
testExecution();
