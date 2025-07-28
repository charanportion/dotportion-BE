/**
 * Replaces dynamic values in templates using {{variable}} syntax
 * @param {any} template - The template object or value
 * @param {object} input - Input data
 * @param {object} context - Execution context
 * @returns {any} - Resolved template
 */
export default function replaceDynamicValues(obj, input, context) {
  if (obj == null) return obj;
  // console.log("context", context);

  const replace = (value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.startsWith("{{") && trimmed.endsWith("}}")) {
        const word = trimmed.slice(2, -2).trim();
        const keys = word.split("."); // Split by dot to handle nested properties
        // console.log("replace: resolving", word, "keys:", keys);

        // Start with the context or input based on the first key
        let result;
        if (keys[0] in context) {
          result = context[keys[0]];
          // console.log(`replace: found in context[${keys[0]}]:`, result);
        } else if (keys[0] in input) {
          result = input[keys[0]];
          // console.log(`replace: found in input[${keys[0]}]:`, result);
        } else {
          // console.log(`replace: key ${keys[0]} not found in context or input`);
          return undefined;
        }

        // Traverse through the rest of the keys if result is an object
        for (let i = 1; i < keys.length; i++) {
          if (result && typeof result === "object" && keys[i] in result) {
            result = result[keys[i]];
            // console.log(`replace: traversed to [${keys[i]}]:`, result);
          } else {
            // console.log(`replace: key ${keys[i]} not found at this level`);
            return undefined; // Return undefined if the path is invalid
          }
        }

        // If the resolved result is an object or array, recursively replace inside it
        if (result && typeof result === "object") {
          return recurse(result);
        }
        return result;
      }
    }
    return value;
  };

  const recurse = (value) => {
    if (Array.isArray(value)) return value.map(recurse);
    if (typeof value === "object" && value !== null) {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, recurse(v)])
      );
    }
    return replace(value);
  };

  return recurse(obj);
}
