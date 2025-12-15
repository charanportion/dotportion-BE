import { handler } from "../../signup.handler.js";
import { AuthController } from "../../controller/auth-controller.js";

jest.mock("../../controller/auth-controller.js");

describe("Signup Handler", () => {
  test("calls AuthController.signup()", async () => {
    const mockSignup = jest.fn().mockResolvedValue({
      statusCode: 201,
      body: JSON.stringify({ message: "ok" }),
    });

    AuthController.mockImplementation(() => ({
      signup: mockSignup,
    }));

    const event = { body: "{}" };

    const res = await handler(event);

    expect(mockSignup).toHaveBeenCalledWith(event);
    expect(res.statusCode).toBe(201);
  });
});
