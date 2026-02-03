import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Default config for Renal-Safe Keto OMAD
const DEFAULT_CONFIG = {
  caloricCeiling: 1650,
  proteinTarget: 120,
  fatTarget: 120,
  netCarbLimit: 25,
  renalProtection: true,
  hypertensionManagement: true,
  ketoProtocol: true,
  sodiumDailyLimit: 2300, // mg
  potassiumDailyMinimum: 3500, // mg
  scheduleMode: "omad" as const,
  weekendMealSlots: 2,
  currentWeight: undefined as number | undefined,
  goalWeight: undefined as number | undefined,
};

export const getConfig = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return null;

    const config = await ctx.db
      .query("nutritionConfig")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    if (!config) {
      // Return defaults if no config exists
      return { ...DEFAULT_CONFIG, exists: false };
    }

    return { ...config, exists: true };
  },
});

export const initializeConfig = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    // Check if config already exists
    const existing = await ctx.db
      .query("nutritionConfig")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create with defaults
    const configId = await ctx.db.insert("nutritionConfig", {
      userId: session.userId,
      ...DEFAULT_CONFIG,
      updatedAt: Date.now(),
    });

    return configId;
  },
});

export const updateConfig = mutation({
  args: {
    token: v.string(),
    caloricCeiling: v.optional(v.number()),
    proteinTarget: v.optional(v.number()),
    fatTarget: v.optional(v.number()),
    netCarbLimit: v.optional(v.number()),
    renalProtection: v.optional(v.boolean()),
    hypertensionManagement: v.optional(v.boolean()),
    ketoProtocol: v.optional(v.boolean()),
    sodiumDailyLimit: v.optional(v.number()),
    potassiumDailyMinimum: v.optional(v.number()),
    scheduleMode: v.optional(v.union(v.literal("omad"), v.literal("weekend_if"), v.literal("custom"))),
    weekendMealSlots: v.optional(v.number()),
    currentWeight: v.optional(v.number()),
    goalWeight: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const config = await ctx.db
      .query("nutritionConfig")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    if (!config) {
      throw new Error("Config not initialized");
    }

    const { token, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(config._id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get schedule for a specific date (OMAD vs Weekend IF)
export const getScheduleForDate = query({
  args: { 
    token: v.string(),
    date: v.string(), // "2026-02-03"
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return null;

    const config = await ctx.db
      .query("nutritionConfig")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    const dateObj = new Date(args.date);
    const dayOfWeek = dateObj.getDay(); // 0=Sunday, 6=Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (!config || config.scheduleMode === "omad") {
      return {
        mealSlots: isWeekend && config?.scheduleMode !== "omad" ? (config?.weekendMealSlots ?? 2) : 1,
        isWeekend,
        dayOfWeek,
      };
    }

    if (config.scheduleMode === "weekend_if") {
      return {
        mealSlots: isWeekend ? (config.weekendMealSlots ?? 2) : 1,
        isWeekend,
        dayOfWeek,
      };
    }

    // Custom mode - return configured slots
    return {
      mealSlots: config.weekendMealSlots ?? 1,
      isWeekend,
      dayOfWeek,
    };
  },
});
