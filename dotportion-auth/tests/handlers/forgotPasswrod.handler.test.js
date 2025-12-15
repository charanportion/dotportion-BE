import { handler } from "../../forgot-password.handler.js";
import { AuthController } from "../../controller/auth-controller.js";

jest.mock("../../controller/auth-controller.js");

describe("Forgot Password Handler", () => {
  test("calls forgotPassword()", async () => {
    const fn = jest.fn().mockResolvedValue({ statusCode: 200 });

    AuthController.mockImplementation(() => ({
      forgotPassword: fn,
    }));

    const res = await handler({ body: "{}" });

    expect(fn).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});
