// run-local.js
import fs from "fs";
import { handler } from "./update-onboarding.js"; // import your Lambda

// Load test event
const event = JSON.parse(fs.readFileSync("onboarding-event.json", "utf-8"));

// Run handler
handler(event)
  .then((res) => {
    console.log("Lambda Output:\n", JSON.stringify(res, null, 2));
  })
  .catch((err) => {
    console.error("Lambda Error:", err);
  });
