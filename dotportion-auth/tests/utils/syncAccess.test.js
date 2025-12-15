import { syncUserAccessWithWaitlist } from "../../utils/syncAccess.js";

describe("syncUserAccessWithWaitlist", () => {
  test("copies waitlist access to user", () => {
    const user = { access: {} };
    const waitlist = {
      status: "approved",
      type: "waitlist",
      createdAt: new Date("2024"),
    };

    const updated = syncUserAccessWithWaitlist(user, waitlist);

    expect(updated.access.status).toBe("approved");
    expect(updated.access.source).toBe("waitlist");
  });

  test("returns user unchanged if waitlist missing", () => {
    const user = { access: {} };

    const updated = syncUserAccessWithWaitlist(user, null);

    expect(updated).toBe(user);
  });
});
