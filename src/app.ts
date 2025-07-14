import express from "express";
import helmet from "helmet";
import cors from "cors";
import jobTitleRoutes from "./routes/jobTitle.routes";
import { generalRateLimiter } from "./middlewares/rateLimiter.middleware";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(generalRateLimiter);

app.use("/job-titles", jobTitleRoutes);

export default app;
