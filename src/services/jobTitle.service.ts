import { Request, Response } from "express";
import { fork } from "child_process";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

export async function standardizeJobTitles(req: Request, res: Response) {
  const numProcesses = Number(process.env.NUM_ENQUEUERS) || 2;

  console.log(`Spawning ${numProcesses} enqueuer processes...`);

  for (let i = 0; i < numProcesses; i++) {
    const workerPath = path.resolve(__dirname, "../temporal/enqueueWorker.ts");

    const worker = fork(workerPath);

    worker.on("exit", (code) => {
      console.log(`Enqueuer process ${worker.pid} exited with code ${code}`);
    });
  }
}
