import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron(
  "daily-generation",
  "20 6 * * 1-5", // Monday to Friday at 06:20 UTC (11:50 AM IST)
  internal.generation.runAll
);

export default crons;
