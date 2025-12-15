import { handler } from "../../github-login.handler.js";
import { OAuthController } from "../../controller/oauth-controller.js";

jest.mock("../../controller/oauth-controller.js");

describe("GitHub Login Handler", () => {
  test("calls githubLogin()", async () => {
    const fn = jest.fn().mockResolvedValue({ statusCode: 302 });

    OAuthController.mockImplementation(() => ({
      githubLogin: fn,
    }));

    const res = await handler({});

    expect(fn).toHaveBeenCalled();
    expect(res.statusCode).toBe(302);
  });
});
