export const createResponse = (statusCode, body, headers = {}) => {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // Enable CORS
      "Access-Control-Allow-Credentials": true,
      ...headers,
    },
    body: JSON.stringify(body),
  };
};
