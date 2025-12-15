import { handler } from "../../reset-password.handler.js";
import { AuthController } from "../../controller/auth-controller.js";

jest.mock("../../controller/auth-controller.js");

describe("Reset Password Handler", () => {
  test("calls resetPassword()", async () => {
    const fn = jest.fn().mockResolvedValue({ statusCode: 200 });

    AuthController.mockImplementation(() => ({
      resetPassword: fn,
    }));

    const res = await handler({ body: "{}" });

    expect(fn).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});
