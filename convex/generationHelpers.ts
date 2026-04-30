import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getClinic = internalQuery({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.clinicId);
  },
});
