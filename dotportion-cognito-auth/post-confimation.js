import { createDBHandler } from "/opt/nodejs/utils/db.js";
import UserModel from "/opt/nodejs/models/UserModel.js";
import logger from "/opt/nodejs/utils/logger.js";

// import { createDBHandler } from "../layers/common/nodejs/utils/db.js";
// import UserModel from "../layers/common/nodejs/models/UserModel.js";
// import logger from "../layers/common/nodejs/utils/logger.js";

const { MONGO_URI, MDataBase } = process.env;

const dbHandler = createDBHandler(MONGO_URI, MDataBase, logger);

export const handler = async (event) => {
  logger.info("Received Cognito event:", JSON.stringify(event, null, 2));

  // Ensure this trigger only runs for the "Confirm Sign Up" event
  if (event.triggerSource !== "PostConfirmation_ConfirmSignUp") {
    logger.info(
      `Event source is ${event.triggerSource}, not PostConfirmation_ConfirmSignUp. Exiting.`
    );
    return event;
  }

  const { sub, email, name, family_name, given_name } =
    event.request.userAttributes;

  try {
    // Connect to database using the new DBHandler
    await dbHandler.connectDb();
    logger.info("Successfully connected to MongoDB using DBHandler");

    // Create new user using the UserModel
    const newUser = new UserModel({
      cognitoSub: sub,
      email: email,
      name: name,
      full_name: family_name + " " + given_name,
      isVerified: true,
    });

    await newUser.save();
    logger.info(`Successfully created user profile for ${email} in MongoDB.`);
  } catch (error) {
    logger.error("Error creating user in MongoDB:", error);

    // Check if it's a duplicate key error (user already exists)
    if (error.code === 11000) {
      logger.info(
        `User with email ${email} or name ${name} already exists. Skipping creation.`
      );
    } else {
      // Log the error but don't throw to avoid failing the Cognito flow
      logger.error("Database error details:", {
        message: error.message,
        code: error.code,
        keyPattern: error.keyPattern,
      });
    }
  }

  // Return the event object back to Cognito to complete the flow
  return event;
};
