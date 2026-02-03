import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {
    token: v.string(),
    category: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return [];

    let ingredients;
    if (args.category && args.category.length > 0) {
      ingredients = await ctx.db
        .query("ingredients")
        .withIndex("by_user_category", (q) =>
          q.eq("userId", session.userId).eq("category", args.category!)
        )
        .collect();
    } else {
      ingredients = await ctx.db
        .query("ingredients")
        .withIndex("by_user", (q) => q.eq("userId", session.userId))
        .collect();
    }

    // Filter by search if provided
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      ingredients = ingredients.filter((i) =>
        i.name.toLowerCase().includes(searchLower)
      );
    }

    return ingredients.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const get = query({
  args: {
    token: v.string(),
    ingredientId: v.id("ingredients"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return null;

    const ingredient = await ctx.db.get(args.ingredientId);
    if (!ingredient || ingredient.userId !== session.userId) return null;

    return ingredient;
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    fdcId: v.optional(v.number()),
    caloriesPer100g: v.number(),
    proteinPer100g: v.number(),
    fatPer100g: v.number(),
    carbsPer100g: v.number(),
    fiberPer100g: v.number(),
    sodiumPer100g: v.number(),
    potassiumPer100g: v.number(),
    isPantryEssential: v.boolean(),
    medicalTags: v.array(v.string()),
    preparationMethods: v.array(v.string()),
    category: v.string(),
    isCooked: v.boolean(),
    yieldFactor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const { token, ...data } = args;
    const now = Date.now();

    const ingredientId = await ctx.db.insert("ingredients", {
      ...data,
      userId: session.userId,
      createdAt: now,
      updatedAt: now,
    });

    return ingredientId;
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    ingredientId: v.id("ingredients"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    caloriesPer100g: v.optional(v.number()),
    proteinPer100g: v.optional(v.number()),
    fatPer100g: v.optional(v.number()),
    carbsPer100g: v.optional(v.number()),
    fiberPer100g: v.optional(v.number()),
    sodiumPer100g: v.optional(v.number()),
    potassiumPer100g: v.optional(v.number()),
    isPantryEssential: v.optional(v.boolean()),
    medicalTags: v.optional(v.array(v.string())),
    preparationMethods: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    isCooked: v.optional(v.boolean()),
    yieldFactor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const ingredient = await ctx.db.get(args.ingredientId);
    if (!ingredient || ingredient.userId !== session.userId) {
      throw new Error("Ingredient not found");
    }

    const { token, ingredientId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(ingredientId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const remove = mutation({
  args: {
    token: v.string(),
    ingredientId: v.id("ingredients"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const ingredient = await ctx.db.get(args.ingredientId);
    if (!ingredient || ingredient.userId !== session.userId) {
      throw new Error("Ingredient not found");
    }

    await ctx.db.delete(args.ingredientId);
    return { success: true };
  },
});

// Import from USDA search result
export const importFromUSDA = mutation({
  args: {
    token: v.string(),
    fdcId: v.number(),
    name: v.string(),
    caloriesPer100g: v.number(),
    proteinPer100g: v.number(),
    fatPer100g: v.number(),
    carbsPer100g: v.number(),
    fiberPer100g: v.number(),
    sodiumPer100g: v.number(),
    potassiumPer100g: v.number(),
    // User must specify these
    category: v.string(),
    isPantryEssential: v.boolean(),
    medicalTags: v.array(v.string()),
    preparationMethods: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const { token, ...data } = args;
    const now = Date.now();

    const ingredientId = await ctx.db.insert("ingredients", {
      ...data,
      userId: session.userId,
      description: undefined,
      isCooked: false,
      yieldFactor: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return ingredientId;
  },
});

// Get categories summary
export const getCategories = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return [];

    const ingredients = await ctx.db
      .query("ingredients")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();

    const categories: Record<string, number> = {};
    for (const ing of ingredients) {
      categories[ing.category] = (categories[ing.category] ?? 0) + 1;
    }

    return Object.entries(categories).map(([name, count]) => ({ name, count }));
  },
});
