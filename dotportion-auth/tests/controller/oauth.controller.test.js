import { OAuthController } from "../../src/controllers/OAuthController.js";

describe("OAuthController", () => {
  let controller;
  let mockService;
  let mockLogger;
  let mockCreateResponse;

  beforeEach(() => {
    mockService = {
      getGoogleAuthURL: jest.fn(),
      handleGoogleCallback: jest.fn(),
      getGitHubAuthURL: jest.fn(),
      handleGitHubCallback: jest.fn(),
      saveUsernameAndRefreshTokenByEmail: jest.fn(),
    };

    mockLogger = { info: jest.fn(), error: jest.fn() };

    mockCreateResponse = jest.fn((status, body, headers) => ({
      statusCode: status,
      body: JSON.stringify(body),
      headers,
    }));

    controller = new OAuthController(
      mockService,
      mockLogger,
      mockCreateResponse
    );
  });

  test("googleLogin → redirects to Google URL", async () => {
    mockService.getGoogleAuthURL.mockReturnValue("https://google.com");

    const res = await controller.googleLogin({});

    expect(res.statusCode).toBe(302);
    expect(res.headers.Location).toBe("https://google.com");
  });

  test("githubLogin → redirects to GitHub URL", async () => {
    mockService.getGitHubAuthURL.mockReturnValue("https://github.com/login");

    const res = await controller.githubLogin({});

    expect(res.statusCode).toBe(302);
  });

  test("setUsername → saves username for user", async () => {
    mockService.saveUsernameAndRefreshTokenByEmail.mockResolvedValue({
      user: {},
      token: "abc123",
    });

    const event = {
      body: JSON.stringify({ email: "a@test.com", username: "john" }),
    };

    const res = await controller.setUsername(event);

    expect(res.statusCode).toBe(200);
    expect(mockService.saveUsernameAndRefreshTokenByEmail).toHaveBeenCalled();
  });
});
