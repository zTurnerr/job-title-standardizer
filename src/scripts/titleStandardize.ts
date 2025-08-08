import path from "path";
import { fork } from "child_process";
import { logger } from "../utils/logger";

const arg = process.argv[2]; // 'experience' or 'education'

if (!arg || !["experience", "education"].includes(arg)) {
  console.error("Please specify 'experience' or 'education' as an argument.");
  process.exit(1);
}

(async () => {
  try {
    console.log(`Starting ${arg} standardization...`);

    const workerPath = path.resolve(__dirname, "../temporal/enqueueWorker.ts");
    const worker = fork(workerPath, [arg], {
      execArgv: ["-r", "ts-node/register"],
    });

    worker.on("exit", (code) => {
      logger.info(`Enqueuer process ${worker.pid} exited with code ${code}`);
    });

    console.log(`${arg} submitted for standardization.`);
  } catch (err) {
    console.error(`Error standardizing ${arg}:`, err);
    process.exit(1);
  }
})();
