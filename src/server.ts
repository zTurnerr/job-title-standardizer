import app from "./app";
import { config } from "./config";
import { logger } from "./utils/logger";

app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});


/**
 * Time taken for each 1k titles, full process, 100 titles per batch with 10 workers = 14 seconds
 * 
 * 
 * 
 * 
 */