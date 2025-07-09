import express from "express";
import helmet from "helmet";
import cors from "cors";
import jobTitleRoutes from "./routes/jobTitle.routes";
import { generalRateLimiter } from "./middlewares/rateLimiter.middleware";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(generalRateLimiter);

// Routes
app.use("/job-titles", jobTitleRoutes);

export default app;
