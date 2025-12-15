import { handler } from "../../login.handler.js";
import { AuthController } from "../../controller/auth-controller.js";

jest.mock("../../controller/auth-controller.js");

describe("Login Handler", () => {
  test("calls AuthController.login()", async () => {
    const mockLogin = jest.fn().mockResolvedValue({ statusCode: 200 });

    AuthController.mockImplementation(() => ({
      login: mockLogin,
    }));

    const res = await handler({ body: "{}" });

    expect(mockLogin).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});
