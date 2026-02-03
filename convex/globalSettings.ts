import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return null;

    const settings = await ctx.db
      .query("globalSettings")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    if (!settings) {
      return {
        exists: false,
        aiProvider: "openrouter",
        aiModel: "anthropic/claude-3.5-sonnet",
        hasApiKey: false,
      };
    }

    return {
      exists: true,
      aiProvider: settings.aiProvider ?? "openrouter",
      aiModel: settings.aiModel ?? "anthropic/claude-3.5-sonnet",
      hasApiKey: !!settings.aiApiKey,
    };
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    aiProvider: v.optional(v.string()),
    aiApiKey: v.optional(v.string()),
    aiModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const existing = await ctx.db
      .query("globalSettings")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    const updates: any = { updatedAt: Date.now() };
    if (args.aiProvider !== undefined) updates.aiProvider = args.aiProvider;
    if (args.aiApiKey !== undefined) updates.aiApiKey = args.aiApiKey;
    if (args.aiModel !== undefined) updates.aiModel = args.aiModel;

    if (existing) {
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    return await ctx.db.insert("globalSettings", {
      userId: session.userId,
      ...updates,
    });
  },
});

// Internal query to get API key for assistant
export const getApiConfig = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("globalSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!settings?.aiApiKey) return null;

    return {
      provider: settings.aiProvider ?? "openrouter",
      apiKey: settings.aiApiKey,
      model: settings.aiModel ?? "anthropic/claude-3.5-sonnet",
    };
  },
});
