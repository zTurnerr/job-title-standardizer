import express, { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Job Title Standardizer API is running.");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
