import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const generate = mutation({
  args: {
    token: v.string(),
    weekStart: v.string(),
    weekEnd: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    // Get all meal plans in the date range
    const startDate = new Date(args.weekStart);
    const endDate = new Date(args.weekEnd);
    const plans = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const plan = await ctx.db
        .query("mealPlans")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", session.userId).eq("date", dateStr)
        )
        .first();
      if (plan) plans.push(plan);
    }

    // Aggregate ingredients
    const ingredientTotals: Record<
      string,
      {
        ingredientId: any;
        ingredientName: string;
        totalWeightGrams: number;
        isPantryEssential: boolean;
        category: string;
      }
    > = {};

    for (const plan of plans) {
      for (const slot of plan.slots) {
        if (slot.mealId) {
          const meal = await ctx.db.get(slot.mealId);
          if (!meal) continue;

          for (const comp of meal.components) {
            const ingredient = await ctx.db.get(comp.ingredientId);
            if (!ingredient) continue;

            const key = comp.ingredientId.toString();
            if (ingredientTotals[key]) {
              ingredientTotals[key].totalWeightGrams += comp.weightGrams;
            } else {
              ingredientTotals[key] = {
                ingredientId: comp.ingredientId,
                ingredientName: ingredient.name,
                totalWeightGrams: comp.weightGrams,
                isPantryEssential: ingredient.isPantryEssential,
                category: ingredient.category,
              };
            }
          }
        }
      }
    }

    const items = Object.values(ingredientTotals).map((item) => ({
      ...item,
      checked: false,
    }));

    // Sort by category, then name
    items.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.ingredientName.localeCompare(b.ingredientName);
    });

    const now = Date.now();

    // Check if list already exists for this week
    const existing = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_week", (q) =>
        q.eq("userId", session.userId).eq("weekStart", args.weekStart)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        weekEnd: args.weekEnd,
        items,
        generatedAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    const listId = await ctx.db.insert("shoppingLists", {
      userId: session.userId,
      weekStart: args.weekStart,
      weekEnd: args.weekEnd,
      items,
      generatedAt: now,
      updatedAt: now,
    });

    return listId;
  },
});

export const get = query({
  args: {
    token: v.string(),
    weekStart: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return null;

    return await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_week", (q) =>
        q.eq("userId", session.userId).eq("weekStart", args.weekStart)
      )
      .first();
  },
});

export const toggleItem = mutation({
  args: {
    token: v.string(),
    listId: v.id("shoppingLists"),
    ingredientId: v.id("ingredients"),
    checked: v.boolean(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== session.userId) {
      throw new Error("List not found");
    }

    const items = list.items.map((item) =>
      item.ingredientId.toString() === args.ingredientId.toString()
        ? { ...item, checked: args.checked }
        : item
    );

    await ctx.db.patch(args.listId, {
      items,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Format weight for display (g -> kg if >= 1000)
function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)}kg`;
  }
  return `${Math.round(grams)}g`;
}

export const getFormatted = query({
  args: {
    token: v.string(),
    weekStart: v.string(),
    excludePantry: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return null;

    const list = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_week", (q) =>
        q.eq("userId", session.userId).eq("weekStart", args.weekStart)
      )
      .first();

    if (!list) return null;

    let items = list.items;
    if (args.excludePantry) {
      items = items.filter((i) => !i.isPantryEssential);
    }

    // Group by category
    const byCategory: Record<string, Array<{ name: string; weight: string; checked: boolean }>> = {};
    for (const item of items) {
      if (!byCategory[item.category]) {
        byCategory[item.category] = [];
      }
      byCategory[item.category].push({
        name: item.ingredientName,
        weight: formatWeight(item.totalWeightGrams),
        checked: item.checked,
      });
    }

    return {
      weekStart: list.weekStart,
      weekEnd: list.weekEnd,
      categories: byCategory,
      totalItems: items.length,
      checkedItems: items.filter((i) => i.checked).length,
    };
  },
});
