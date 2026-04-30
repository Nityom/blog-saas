import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron(
  "daily-generation",
  "30 3 * * 1-5", // Monday to Friday at 03:30 UTC
  internal.generation.runAll
);

export default crons;
