import { handler } from "../../verify-otp.handler.js";
import { AuthController } from "../../controller/auth-controller.js";

jest.mock("../../controller/auth-controller.js");

describe("Verify OTP Handler", () => {
  test("should call controller.verifyOtp()", async () => {
    const fn = jest.fn().mockResolvedValue({ statusCode: 200 });

    AuthController.mockImplementation(() => ({
      verifyOtp: fn,
    }));

    const res = await handler({ body: "{}" });

    expect(fn).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});
