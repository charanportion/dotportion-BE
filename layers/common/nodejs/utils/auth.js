import jwt from "jsonwebtoken";

export const verifyToken = (token) => {
  try {
    if (!token) return null;
    return jwt.verify(token, "my_secret_key_for_dotportion");
  } catch (error) {
    return null;
  }
};
