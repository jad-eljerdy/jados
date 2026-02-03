import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const log = mutation({
  args: {
    token: v.string(),
    date: v.string(),
    weight: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    // Check if entry exists for this date
    const existing = await ctx.db
      .query("weightLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", session.userId).eq("date", args.date)
      )
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        weight: args.weight,
        note: args.note,
      });
      return existing._id;
    }

    // Create new
    const id = await ctx.db.insert("weightLogs", {
      userId: session.userId,
      date: args.date,
      weight: args.weight,
      note: args.note,
      createdAt: Date.now(),
    });

    return id;
  },
});

export const getRecent = query({
  args: {
    token: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return [];

    const logs = await ctx.db
      .query("weightLogs")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .order("desc")
      .take(args.limit ?? 30);

    // Sort by date ascending for chart display
    return logs.sort((a, b) => a.date.localeCompare(b.date));
  },
});

export const getLatest = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return null;

    const latest = await ctx.db
      .query("weightLogs")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .order("desc")
      .first();

    return latest;
  },
});

export const remove = mutation({
  args: {
    token: v.string(),
    logId: v.id("weightLogs"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const log = await ctx.db.get(args.logId);
    if (!log || log.userId !== session.userId) {
      throw new Error("Log not found");
    }

    await ctx.db.delete(args.logId);
    return { success: true };
  },
});
