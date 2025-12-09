const SENSITIVE_FIELDS = new Set([
  "password",
  "newPassword",
  "otp",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "apiKey",
  "secretKey",
]);

/**
 * Detect mongoose/bson ObjectId
 */
const isObjectId = (val) =>
  val &&
  typeof val === "object" &&
  (val._bsontype === "ObjectID" || typeof val.toHexString === "function");

/**
 * Detect Buffer
 */
const isBuffer = (val) => typeof Buffer !== "undefined" && Buffer.isBuffer(val);

/**
 * Deep-sanitize object/array/primitive.
 * - Masks sensitive fields
 * - Converts ObjectId/Buffer to string
 * - Preserves primitives
 */
export const sanitizeData = (input) => {
  const seen = new WeakSet();

  function _sanitize(value) {
    if (value === null || value === undefined) return value;

    // primitives
    if (typeof value !== "object") return value;

    // prevent circular recursion
    if (seen.has(value)) return "[Circular]";
    seen.add(value);

    // ObjectId -> string
    if (isObjectId(value)) {
      try {
        return typeof value.toHexString === "function"
          ? value.toHexString()
          : String(value);
      } catch {
        return String(value);
      }
    }

    // Buffer -> base64 (or toString)
    if (isBuffer(value)) {
      try {
        return value.toString("base64");
      } catch {
        return "[Buffer]";
      }
    }

    // Arrays
    if (Array.isArray(value)) {
      return value.map((v) => _sanitize(v));
    }

    // Plain objects / mongoose docs (which may have toObject())
    const obj = {};
    // If it's a Mongoose Document, convert to plain object first if available
    let plain = value;
    try {
      if (typeof value.toObject === "function") {
        plain = value.toObject({
          depopulate: true,
          getters: false,
          virtuals: false,
        });
      }
    } catch {
      // ignore
    }

    for (const [k, v] of Object.entries(plain)) {
      if (SENSITIVE_FIELDS.has(k)) {
        obj[k] = "***";
      } else {
        obj[k] = _sanitize(v);
      }
    }

    return obj;
  }

  try {
    return _sanitize(input);
  } catch (err) {
    // Fallback - never throw
    return { notice: "Failed to sanitize data", _error: String(err) };
  }
};
