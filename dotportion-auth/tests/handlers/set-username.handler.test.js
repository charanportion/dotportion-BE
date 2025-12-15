import { handler } from "../../set-username.handler.js";
import { OAuthController } from "../../controller/oauth-controller.js";

jest.mock("../../controller/oauth-controller.js");

describe("Set Username Handler", () => {
  test("calls setUsername()", async () => {
    const fn = jest.fn().mockResolvedValue({ statusCode: 200 });

    OAuthController.mockImplementation(() => ({
      setUsername: fn,
    }));

    const res = await handler({ body: "{}" });

    expect(fn).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});
