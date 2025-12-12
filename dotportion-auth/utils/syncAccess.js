export const syncUserAccessWithWaitlist = (user, waitlist) => {
  if (!waitlist) return user;

  user.access.status = waitlist.status;
  user.access.source = waitlist.type;
  user.access.requestedAt = waitlist.createdAt || new Date();
  user.access.approvedAt = waitlist.status === "approved" ? new Date() : null;
  user.access.rejectedAt = waitlist.status === "rejected" ? new Date() : null;
  user.access.approvedBy = null;

  return user;
};
