module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  moduleFileExtensions: ["ts", "js", "json", "node"],
  modulePaths: ["<rootDir>/src"], // Allow absolute imports from src if needed later
};
