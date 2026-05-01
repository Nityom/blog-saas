import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron(
  "daily-generation",
  "30 6 * * 1-5", // Monday to Friday at 06:30 UTC (12:00 PM IST)
  internal.generation.runAll
);

export default crons;
