import { AuthService } from "../../service/auth-service.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

jest.mock("jsonwebtoken");
jest.mock("bcryptjs");

describe("AuthService", () => {
  let service;
  let mockDB;
  let mockLogger;
  let mockUserModel;
  let mockOtpModel;
  let mockWaitlistModel;
  let mockEmail;

  beforeEach(() => {
    mockDB = { connectDb: jest.fn() };
    mockLogger = { info: jest.fn(), error: jest.fn() };

    mockUserModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockOtpModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    };

    mockWaitlistModel = {
      findOne: jest.fn(),
    };

    mockEmail = {
      sendOtpEmail: jest.fn(),
    };

    service = new AuthService(
      mockDB,
      mockLogger,
      mockOtpModel,
      mockUserModel,
      mockWaitlistModel,
      mockEmail
    );
  });

  // ------------------
  // SIGN UP TESTS
  // ------------------

  test("signUp → returns 400 if email exists", async () => {
    mockUserModel.findOne.mockResolvedValueOnce(true);

    const result = await service.signUp(
      "test@test.com",
      "pass",
      "Full Name",
      "name"
    );

    expect(result.status).toBe(400);
  });

  test("signUp → creates user and sends OTP", async () => {
    mockUserModel.findOne.mockResolvedValueOnce(null);
    mockUserModel.findOne.mockResolvedValueOnce(null);

    mockUserModel.create.mockResolvedValue({
      _id: "123",
      toObject: () => ({ email: "test@test.com" }),
    });

    const res = await service.signUp(
      "test@test.com",
      "12345678",
      "Full Name",
      "username"
    );

    expect(res.status).toBe(201);
    expect(mockEmail.sendOtpEmail).toHaveBeenCalled();
    expect(mockOtpModel.create).toHaveBeenCalled();
  });

  // ------------------
  // VERIFY OTP TESTS
  // ------------------

  test("verifyOtp → fails if user not found", async () => {
    mockUserModel.findOne.mockResolvedValueOnce(null);

    const result = await service.verifyOtp("x@test.com", "111111", "REGISTER");

    expect(result.status).toBe(400);
  });

  test("verifyOtp → returns 200 with token", async () => {
    mockUserModel.findOne.mockResolvedValueOnce({
      _id: "1",
      email: "a@test.com",
      save: jest.fn(),
    });

    mockOtpModel.findOne.mockResolvedValueOnce({
      otp: "123456",
      expiresAt: new Date(Date.now() + 10000),
      used: false,
      save: jest.fn(),
    });

    jwt.sign.mockReturnValue("mockedToken");

    const result = await service.verifyOtp("a@test.com", "123456", "REGISTER");

    expect(result.status).toBe(200);
    expect(result.token).toBe("mockedToken");
  });

  // ------------------
  // LOGIN TESTS
  // ------------------

  test("login → returns 400 if user not found", async () => {
    mockUserModel.findOne.mockResolvedValueOnce(null);

    const result = await service.login("a@test.com", "pass");

    expect(result.status).toBe(400);
  });

  test("login → returns 403 if user not verified", async () => {
    mockUserModel.findOne.mockResolvedValueOnce({ isVerified: false });

    const result = await service.login("a@test.com", "pass");

    expect(result.status).toBe(403);
  });

  test("login → returns token on success", async () => {
    mockUserModel.findOne.mockResolvedValueOnce({
      _id: "1",
      email: "a@test.com",
      name: "john",
      isVerified: true,
      password: "hashed",
    });

    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("jwtToken");

    const result = await service.login("a@test.com", "pass");

    expect(result.status).toBe(200);
    expect(result.token).toBe("jwtToken");
  });

  // ---------------------------
  // FORGOT PASSWORD TESTS
  // ---------------------------

  test("forgotPassword → returns 404 if user not found", async () => {
    mockUserModel.findOne.mockResolvedValueOnce(null);

    const res = await service.forgotPassword("no@test.com");

    expect(res.status).toBe(404);
  });

  test("forgotPassword → sends OTP when user exists", async () => {
    mockUserModel.findOne.mockResolvedValueOnce({
      _id: "1",
      email: "a@test.com",
    });

    const res = await service.forgotPassword("a@test.com");

    expect(mockOtpModel.create).toHaveBeenCalled();
    expect(mockEmail.sendOtpEmail).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  // ---------------------------
  // RESET PASSWORD TESTS
  // ---------------------------

  test("resetPassword → returns 404 if user not found", async () => {
    mockUserModel.findOne.mockResolvedValueOnce(null);

    const res = await service.resetPassword("x@test.com", "123456", "new");

    expect(res.status).toBe(404);
  });

  test("resetPassword → returns error if OTP not found", async () => {
    mockUserModel.findOne.mockResolvedValueOnce({
      _id: "1",
      email: "a@test.com",
    });
    mockOtpModel.findOne.mockResolvedValueOnce(null);

    const res = await service.resetPassword("a@test.com", "123456", "newpass");

    expect(res.status).toBe(400);
  });

  test("resetPassword → fails if OTP expired", async () => {
    mockUserModel.findOne.mockResolvedValueOnce({
      _id: "1",
      email: "a@test.com",
    });

    mockOtpModel.findOne.mockResolvedValueOnce({
      otp: "123456",
      expiresAt: new Date(Date.now() - 10000),
      used: false,
    });

    const res = await service.resetPassword("a@test.com", "123456", "new");

    expect(res.status).toBe(400);
    expect(res.message).toMatch(/expired/i);
  });

  test("resetPassword → resets password on success", async () => {
    const mockUser = { _id: "1", email: "a@test.com", save: jest.fn() };

    mockUserModel.findOne.mockResolvedValueOnce(mockUser);

    mockOtpModel.findOne.mockResolvedValueOnce({
      otp: "123456",
      expiresAt: new Date(Date.now() + 10000),
      used: false,
      save: jest.fn(),
    });

    bcrypt.hash.mockResolvedValue("hashedPassword");

    const res = await service.resetPassword(
      "a@test.com",
      "123456",
      "newPassword"
    );

    expect(mockUser.save).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});
