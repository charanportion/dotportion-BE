import { handler } from "../../google-callback.handler.js";
import { OAuthController } from "../../controller/oauth-controller.js";

jest.mock("../../controller/oauth-controller.js");

describe("Google Callback Handler", () => {
  test("calls googleCallback()", async () => {
    const fn = jest.fn().mockResolvedValue({ statusCode: 302 });

    OAuthController.mockImplementation(() => ({
      googleCallback: fn,
    }));

    const res = await handler({ queryStringParameters: {} });

    expect(fn).toHaveBeenCalled();
    expect(res.statusCode).toBe(302);
  });
});
