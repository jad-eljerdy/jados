import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper to calculate meal totals from components
async function calculateMealTotals(
  ctx: any,
  components: Array<{
    ingredientId: any;
    weightGrams: number;
  }>
) {
  let totals = {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0,
    sodium: 0,
    potassium: 0,
  };

  for (const comp of components) {
    const ingredient = await ctx.db.get(comp.ingredientId);
    if (!ingredient) continue;

    const multiplier = comp.weightGrams / 100;
    totals.calories += ingredient.caloriesPer100g * multiplier;
    totals.protein += ingredient.proteinPer100g * multiplier;
    totals.fat += ingredient.fatPer100g * multiplier;
    totals.carbs += ingredient.carbsPer100g * multiplier;
    totals.fiber += ingredient.fiberPer100g * multiplier;
    totals.sodium += ingredient.sodiumPer100g * multiplier;
    totals.potassium += ingredient.potassiumPer100g * multiplier;
  }

  // Round to 1 decimal
  return {
    calories: Math.round(totals.calories * 10) / 10,
    protein: Math.round(totals.protein * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fiber: Math.round(totals.fiber * 10) / 10,
    sodium: Math.round(totals.sodium * 10) / 10,
    potassium: Math.round(totals.potassium * 10) / 10,
  };
}

export const list = query({
  args: {
    token: v.string(),
    favoritesOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return [];

    let meals;
    if (args.favoritesOnly) {
      meals = await ctx.db
        .query("meals")
        .withIndex("by_user_favorite", (q) =>
          q.eq("userId", session.userId).eq("isFavorite", true)
        )
        .collect();
    } else {
      meals = await ctx.db
        .query("meals")
        .withIndex("by_user", (q) => q.eq("userId", session.userId))
        .collect();
    }

    return meals.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const get = query({
  args: {
    token: v.string(),
    mealId: v.id("meals"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return null;

    const meal = await ctx.db.get(args.mealId);
    if (!meal || meal.userId !== session.userId) return null;

    // Enrich components with ingredient details
    const enrichedComponents = await Promise.all(
      meal.components.map(async (comp) => {
        const ingredient = await ctx.db.get(comp.ingredientId);
        return {
          ...comp,
          ingredientName: ingredient?.name ?? "Unknown",
          ingredientCategory: ingredient?.category ?? "unknown",
        };
      })
    );

    return { ...meal, components: enrichedComponents };
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    components: v.array(
      v.object({
        slot: v.string(),
        ingredientId: v.id("ingredients"),
        weightGrams: v.number(),
        preparationMethod: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const totals = await calculateMealTotals(ctx, args.components);
    const now = Date.now();

    const mealId = await ctx.db.insert("meals", {
      userId: session.userId,
      name: args.name,
      description: args.description,
      components: args.components,
      totalCalories: totals.calories,
      totalProtein: totals.protein,
      totalFat: totals.fat,
      totalCarbs: totals.carbs,
      totalFiber: totals.fiber,
      totalSodium: totals.sodium,
      totalPotassium: totals.potassium,
      isFavorite: false,
      tags: args.tags,
      createdAt: now,
      updatedAt: now,
    });

    return mealId;
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    mealId: v.id("meals"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    components: v.optional(
      v.array(
        v.object({
          slot: v.string(),
          ingredientId: v.id("ingredients"),
          weightGrams: v.number(),
          preparationMethod: v.optional(v.string()),
          notes: v.optional(v.string()),
        })
      )
    ),
    tags: v.optional(v.array(v.string())),
    isFavorite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const meal = await ctx.db.get(args.mealId);
    if (!meal || meal.userId !== session.userId) {
      throw new Error("Meal not found");
    }

    const updates: any = { updatedAt: Date.now() };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.isFavorite !== undefined) updates.isFavorite = args.isFavorite;

    if (args.components !== undefined) {
      updates.components = args.components;
      const totals = await calculateMealTotals(ctx, args.components);
      updates.totalCalories = totals.calories;
      updates.totalProtein = totals.protein;
      updates.totalFat = totals.fat;
      updates.totalCarbs = totals.carbs;
      updates.totalFiber = totals.fiber;
      updates.totalSodium = totals.sodium;
      updates.totalPotassium = totals.potassium;
    }

    await ctx.db.patch(args.mealId, updates);
    return { success: true };
  },
});

export const remove = mutation({
  args: {
    token: v.string(),
    mealId: v.id("meals"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const meal = await ctx.db.get(args.mealId);
    if (!meal || meal.userId !== session.userId) {
      throw new Error("Meal not found");
    }

    await ctx.db.delete(args.mealId);
    return { success: true };
  },
});

// Duplicate a meal
export const duplicate = mutation({
  args: {
    token: v.string(),
    mealId: v.id("meals"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const meal = await ctx.db.get(args.mealId);
    if (!meal || meal.userId !== session.userId) {
      throw new Error("Meal not found");
    }

    const now = Date.now();
    const newMealId = await ctx.db.insert("meals", {
      userId: session.userId,
      name: `${meal.name} (copy)`,
      description: meal.description,
      components: meal.components,
      totalCalories: meal.totalCalories,
      totalProtein: meal.totalProtein,
      totalFat: meal.totalFat,
      totalCarbs: meal.totalCarbs,
      totalFiber: meal.totalFiber,
      totalSodium: meal.totalSodium,
      totalPotassium: meal.totalPotassium,
      isFavorite: false,
      tags: meal.tags,
      createdAt: now,
      updatedAt: now,
    });

    return newMealId;
  },
});

// Calculate totals for arbitrary components (preview before saving)
export const calculateTotals = query({
  args: {
    token: v.string(),
    components: v.array(
      v.object({
        ingredientId: v.id("ingredients"),
        weightGrams: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return null;

    return await calculateMealTotals(ctx, args.components);
  },
});
