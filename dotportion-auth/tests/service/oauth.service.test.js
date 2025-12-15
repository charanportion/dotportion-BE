import { OAuthService } from "../../src/services/OAuthService.js";
import axios from "axios";
import jwt from "jsonwebtoken";

jest.mock("axios");
jest.mock("jsonwebtoken");

describe("OAuthService", () => {
  let service;
  let mockDB;
  let mockLogger;
  let mockUserModel;
  let mockWaitlistModel;

  beforeEach(() => {
    mockDB = { connectDb: jest.fn() };
    mockLogger = { info: jest.fn(), error: jest.fn() };

    mockUserModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockWaitlistModel = {
      findOne: jest.fn(),
    };

    service = new OAuthService(
      mockDB,
      mockLogger,
      mockUserModel,
      mockWaitlistModel
    );
  });

  test("getGoogleAuthURL → returns valid URL", () => {
    const url = service.getGoogleAuthURL();

    expect(url).toContain("accounts.google.com");
  });

  test("handleGoogleCallback → creates new OAuth user", async () => {
    axios.post.mockResolvedValue({
      data: { id_token: createMockIDToken("test@test.com", "John Doe", "pic") },
    });

    mockUserModel.findOne.mockResolvedValueOnce(null);

    mockUserModel.create.mockResolvedValue({
      _id: "123",
      email: "test@test.com",
      name: "john",
    });

    jwt.sign.mockReturnValue("jwtToken");

    const result = await service.handleGoogleCallback("code123");

    expect(result.token).toBe("jwtToken");
    expect(result.isNewUser).toBe(true);
  });
});

// helper
function createMockIDToken(email, name, picture) {
  return [
    "header",
    Buffer.from(JSON.stringify({ email, name, picture })).toString("base64"),
    "signature",
  ].join(".");
}
