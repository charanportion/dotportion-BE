export default {
  testEnvironment: "node",
  setupFilesAfterEnv: [
    "<rootDir>/tests/setup/jest.setup.js",
    "<rootDir>/tests/setup/globalMocks.js",
  ],
  moduleFileExtensions: ["js", "json"],
  verbose: true,
};
