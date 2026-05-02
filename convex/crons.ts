import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

const crons = cronJobs();

crons.cron(
  "daily-generation",
  "35 6 * * 1-5", // Monday to Friday at 06:35 UTC (12:05 PM IST)
  internal.generation.runAll
);

crons.interval(
  "refresh meta tokens",
  { hours: 24 * 45 },
  api.social.refreshAllMetaTokens
);

export default crons;
