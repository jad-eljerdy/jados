import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getProfile = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },
});

export const updateProfile = mutation({
  args: {
    token: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updates: { name?: string; avatarUrl?: string; updatedAt: number } = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.avatarUrl !== undefined) {
      updates.avatarUrl = args.avatarUrl;
    }

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});

export const updateEmail = mutation({
  args: {
    token: v.string(),
    newEmail: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if email is already taken
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.newEmail.toLowerCase()))
      .first();

    if (existing && existing._id !== user._id) {
      throw new Error("Email already in use");
    }

    await ctx.db.patch(user._id, {
      email: args.newEmail.toLowerCase(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Generate a storage URL for avatar upload
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveAvatar = mutation({
  args: {
    token: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const url = await ctx.storage.getUrl(args.storageId);

    await ctx.db.patch(user._id, {
      avatarUrl: url ?? undefined,
      updatedAt: Date.now(),
    });

    return { success: true, avatarUrl: url };
  },
});
