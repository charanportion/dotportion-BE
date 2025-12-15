// Mock DB handler
jest.mock("../../layers/common/nodejs/utils/db.js", () => ({
  createDBHandler: jest.fn(() => ({})),
}));

// Mock logger
jest.mock("../../layers/common/nodejs/utils/logger.js", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

// Mock API response helper
jest.mock("../../layers/common/nodejs/utils/api.js", () => ({
  createResponse: jest.fn((status, body, headers = {}) => ({
    statusCode: status,
    headers,
    body: JSON.stringify(body),
  })),
}));

// Mock Models
jest.mock("../../layers/common/nodejs/models/UserModel.js", () => ({}));
jest.mock("../../layers/common/nodejs/models/otpModel.js", () => ({}));
jest.mock("../../layers/common/nodejs/models/WaitListModel.js", () => ({}));

// Mock Nodemailer globally
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    verify: jest.fn(),
    sendMail: jest.fn(),
  })),
}));
