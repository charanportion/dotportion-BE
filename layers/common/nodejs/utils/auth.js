import jwt from "jsonwebtoken";

export const verifyToken = (token) => {
  try {
    if (!token) return null;
    return jwt.verify(token, "my_secret_key_for_dotportion");
  } catch (error) {
    return null;
  }
};

export const verifyJwt = (event) => {
  try {
    const authHeader =
      event.headers?.Authorization || event.headers?.authorization;

    if (!authHeader)
      return {
        error: { status: 401, message: "Missing Authorization header" },
      };

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, "my_secret_key_for_dotportion");

    return { userId: decoded.userId };
  } catch (err) {
    return { error: { status: 401, message: "Invalid or expired token" } };
  }
};
