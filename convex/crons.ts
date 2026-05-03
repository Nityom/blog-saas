import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

const crons = cronJobs();

crons.cron(
  "daily-generation",
  "30 3 * * 1-5", // Monday to Friday at 03:30 UTC (9:00 AM IST)
  internal.generation.runAll
);

crons.interval(
  "refresh meta tokens",
  { hours: 24 * 45 },
  api.social.refreshAllMetaTokens
);

// Every Sunday at 03:00 UTC — refresh up to 5 posts that are 90+ days stale
crons.cron(
  "weekly-content-refresh",
  "0 3 * * 0",
  internal.generation.refreshAllOldPosts
);

export default crons;

