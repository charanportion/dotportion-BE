import { handler } from "../../resend-otp.handler.js";
import { AuthController } from "../../controller/auth-controller.js";

jest.mock("../../controller/auth-controller.js");

describe("Resend OTP Handler", () => {
  test("should call controller.resendOtp()", async () => {
    const fn = jest.fn().mockResolvedValue({ statusCode: 200 });

    AuthController.mockImplementation(() => ({
      resendOtp: fn,
    }));

    const res = await handler({ body: "{}" });

    expect(fn).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});
