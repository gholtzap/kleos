try {
  process.loadEnvFile(".env");
} catch {
  // No local .env file — e.g. CI, where env vars are already provided.
}
