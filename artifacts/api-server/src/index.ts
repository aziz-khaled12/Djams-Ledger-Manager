import serverless from "serverless-http";
import app from "./app";
import { logger } from "./lib/logger";

// Optional: log cold starts
logger.info("Serverless function initialized");

export default serverless(app);