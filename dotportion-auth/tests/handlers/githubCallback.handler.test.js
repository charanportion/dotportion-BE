import { handler } from "../../github-callback.handler.js";
import { OAuthController } from "../../controller/oauth-controller.js";

jest.mock("../../controller/oauth-controller.js");

describe("GitHub Callback Handler", () => {
  test("calls githubCallback()", async () => {
    const fn = jest.fn().mockResolvedValue({ statusCode: 302 });

    OAuthController.mockImplementation(() => ({
      githubCallback: fn,
    }));

    const res = await handler({ queryStringParameters: {} });

    expect(fn).toHaveBeenCalled();
    expect(res.statusCode).toBe(302);
  });
});
