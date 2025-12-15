import { AuthController } from "../../controller/auth-controller.js";

describe("AuthController", () => {
  let controller;
  let mockService;
  let mockLogger;
  let mockCreateResponse;

  beforeEach(() => {
    mockService = {
      signUp: jest.fn(),
      verifyOtp: jest.fn(),
      resendOtp: jest.fn(),
      login: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
    };

    mockLogger = { info: jest.fn(), error: jest.fn() };

    mockCreateResponse = jest.fn((status, body) => ({
      statusCode: status,
      body: JSON.stringify(body),
    }));

    controller = new AuthController(
      mockService,
      mockLogger,
      mockCreateResponse
    );
  });

  // ---------------------------
  // SIGNUP TESTS
  // ---------------------------

  test("signup → returns 400 if body missing", async () => {
    const event = { body: null };

    const response = await controller.signup(event);

    expect(response.statusCode).toBe(400);
  });

  test("signup → returns 400 for invalid email", async () => {
    const event = {
      body: JSON.stringify({
        email: "bad",
        password: "12345678",
        name: "john",
        full_name: "John Doe",
      }),
    };

    const response = await controller.signup(event);

    expect(response.statusCode).toBe(400);
  });

  test("signup → calls authService.signUp", async () => {
    mockService.signUp.mockResolvedValue({
      status: 201,
      message: "OK",
      user: {},
    });

    const event = {
      body: JSON.stringify({
        email: "test@test.com",
        password: "12345678",
        name: "john",
        full_name: "John Doe",
      }),
    };

    await controller.signup(event);

    expect(mockService.signUp).toHaveBeenCalledWith(
      "test@test.com",
      "12345678",
      "John Doe",
      "john"
    );
  });

  // ---------------------------
  // VERIFY OTP TESTS
  // ---------------------------

  test("verifyOtp → calls service and returns token", async () => {
    mockService.verifyOtp.mockResolvedValue({
      status: 200,
      message: "OTP verified",
      token: "abc",
      user: {},
    });

    const event = {
      body: JSON.stringify({
        email: "a@test.com",
        otp: "123456",
        context: "REGISTER",
      }),
    };

    const res = await controller.verifyOtp(event);

    expect(mockService.verifyOtp).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  // ---------------------------
  // LOGIN TESTS
  // ---------------------------

  test("login → returns 400 if body missing", async () => {
    const response = await controller.login({ body: null });

    expect(response.statusCode).toBe(400);
  });

  test("login → returns 200 with token", async () => {
    mockService.login.mockResolvedValue({
      status: 200,
      message: "Login OK",
      token: "jwt",
      user: {},
    });

    const event = {
      body: JSON.stringify({ email: "x@test.com", password: "12345678" }),
    };
    const res = await controller.login(event);

    expect(res.statusCode).toBe(200);
    expect(mockService.login).toHaveBeenCalled();
  });

  // ---------------------------
  // FORGOT PASSWORD TESTS
  // ---------------------------

  test("forgotPassword → returns 400 if body missing", async () => {
    const res = await controller.forgotPassword({ body: null });

    expect(res.statusCode).toBe(400);
  });

  test("forgotPassword → calls authService.forgotPassword", async () => {
    mockService.forgotPassword.mockResolvedValue({
      status: 200,
      message: "OK",
    });

    const event = {
      body: JSON.stringify({ email: "test@test.com" }),
    };

    const res = await controller.forgotPassword(event);

    expect(mockService.forgotPassword).toHaveBeenCalledWith("test@test.com");
    expect(res.statusCode).toBe(200);
  });

  // ---------------------------
  // RESET PASSWORD TESTS
  // ---------------------------

  test("resetPassword → returns 400 if body missing", async () => {
    const res = await controller.resetPassword({ body: null });

    expect(res.statusCode).toBe(400);
  });

  test("resetPassword → calls authService.resetPassword", async () => {
    mockService.resetPassword.mockResolvedValue({
      status: 200,
      message: "Password reset successfully",
    });

    const event = {
      body: JSON.stringify({
        email: "user@test.com",
        otp: "123456",
        new_password: "newpass",
      }),
    };

    const res = await controller.resetPassword(event);

    expect(mockService.resetPassword).toHaveBeenCalledWith(
      "user@test.com",
      "123456",
      "newpass"
    );
    expect(res.statusCode).toBe(200);
  });
});
