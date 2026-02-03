import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Validate a day's plan against config
async function validateDayPlan(
  ctx: any,
  userId: any,
  totals: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
    sodium: number;
    potassium: number;
  }
) {
  const config = await ctx.db
    .query("nutritionConfig")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (!config) return [];

  const warnings: string[] = [];
  const netCarbs = totals.carbs - totals.fiber;

  if (totals.calories > config.caloricCeiling) {
    warnings.push(`Exceeds caloric limit (${Math.round(totals.calories)}/${config.caloricCeiling} kcal)`);
  }
  if (totals.protein < config.proteinTarget * 0.9) {
    warnings.push(`Below protein minimum (${Math.round(totals.protein)}/${config.proteinTarget}g)`);
  }
  if (netCarbs > config.netCarbLimit) {
    warnings.push(`Exceeds net carb limit (${Math.round(netCarbs)}/${config.netCarbLimit}g)`);
  }
  if (config.hypertensionManagement && config.sodiumDailyLimit && totals.sodium > config.sodiumDailyLimit) {
    warnings.push(`Exceeds sodium limit (${Math.round(totals.sodium)}/${config.sodiumDailyLimit}mg)`);
  }
  if (config.hypertensionManagement && config.potassiumDailyMinimum && totals.potassium < config.potassiumDailyMinimum) {
    warnings.push(`Below potassium minimum (${Math.round(totals.potassium)}/${config.potassiumDailyMinimum}mg)`);
  }

  return warnings;
}

export const getWeek = query({
  args: {
    token: v.string(),
    weekStart: v.string(), // "2026-02-03" (Monday)
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return [];

    // Get 7 days starting from weekStart
    const startDate = new Date(args.weekStart);
    const plans = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      const plan = await ctx.db
        .query("mealPlans")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", session.userId).eq("date", dateStr)
        )
        .first();

      plans.push({
        date: dateStr,
        dayOfWeek: date.getDay(),
        plan: plan ?? null,
      });
    }

    return plans;
  },
});

export const getDay = query({
  args: {
    token: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return null;

    const plan = await ctx.db
      .query("mealPlans")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", session.userId).eq("date", args.date)
      )
      .first();

    if (!plan) return null;

    // Enrich with meal details
    const enrichedSlots = await Promise.all(
      plan.slots.map(async (slot) => {
        if (slot.mealId) {
          const meal = await ctx.db.get(slot.mealId);
          return { ...slot, mealName: meal?.name ?? "Unknown" };
        }
        return slot;
      })
    );

    return { ...plan, slots: enrichedSlots };
  },
});

export const setDayMeal = mutation({
  args: {
    token: v.string(),
    date: v.string(),
    slotIndex: v.number(),
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

    const dateObj = new Date(args.date);
    const dayOfWeek = dateObj.getDay();

    // Check if plan exists for this day
    let plan = await ctx.db
      .query("mealPlans")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", session.userId).eq("date", args.date)
      )
      .first();

    const slotData = {
      slotIndex: args.slotIndex,
      mealId: args.mealId,
      customComponents: undefined,
      calories: meal.totalCalories,
      protein: meal.totalProtein,
      fat: meal.totalFat,
      carbs: meal.totalCarbs,
      fiber: meal.totalFiber,
      sodium: meal.totalSodium,
      potassium: meal.totalPotassium,
    };

    const now = Date.now();

    if (plan) {
      // Update existing slot or add new one
      const slots = [...plan.slots];
      const existingIndex = slots.findIndex((s) => s.slotIndex === args.slotIndex);
      if (existingIndex >= 0) {
        slots[existingIndex] = slotData;
      } else {
        slots.push(slotData);
      }

      // Recalculate day totals
      const totals = slots.reduce(
        (acc, s) => ({
          calories: acc.calories + s.calories,
          protein: acc.protein + s.protein,
          fat: acc.fat + s.fat,
          carbs: acc.carbs + s.carbs,
          fiber: acc.fiber + s.fiber,
          sodium: acc.sodium + s.sodium,
          potassium: acc.potassium + s.potassium,
        }),
        { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0, potassium: 0 }
      );

      const warnings = await validateDayPlan(ctx, session.userId, totals);

      await ctx.db.patch(plan._id, {
        slots,
        ...totals,
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalFat: totals.fat,
        totalCarbs: totals.carbs,
        totalFiber: totals.fiber,
        totalSodium: totals.sodium,
        totalPotassium: totals.potassium,
        warnings,
        updatedAt: now,
      });

      return { planId: plan._id, warnings };
    } else {
      // Create new plan
      const totals = {
        calories: slotData.calories,
        protein: slotData.protein,
        fat: slotData.fat,
        carbs: slotData.carbs,
        fiber: slotData.fiber,
        sodium: slotData.sodium,
        potassium: slotData.potassium,
      };

      const warnings = await validateDayPlan(ctx, session.userId, totals);

      const planId = await ctx.db.insert("mealPlans", {
        userId: session.userId,
        date: args.date,
        dayOfWeek,
        slots: [slotData],
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalFat: totals.fat,
        totalCarbs: totals.carbs,
        totalFiber: totals.fiber,
        totalSodium: totals.sodium,
        totalPotassium: totals.potassium,
        warnings,
        status: "planned",
        createdAt: now,
        updatedAt: now,
      });

      return { planId, warnings };
    }
  },
});

export const clearDaySlot = mutation({
  args: {
    token: v.string(),
    date: v.string(),
    slotIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const plan = await ctx.db
      .query("mealPlans")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", session.userId).eq("date", args.date)
      )
      .first();

    if (!plan) return { success: true };

    const slots = plan.slots.filter((s) => s.slotIndex !== args.slotIndex);

    if (slots.length === 0) {
      await ctx.db.delete(plan._id);
      return { success: true };
    }

    // Recalculate totals
    const totals = slots.reduce(
      (acc, s) => ({
        calories: acc.calories + s.calories,
        protein: acc.protein + s.protein,
        fat: acc.fat + s.fat,
        carbs: acc.carbs + s.carbs,
        fiber: acc.fiber + s.fiber,
        sodium: acc.sodium + s.sodium,
        potassium: acc.potassium + s.potassium,
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0, potassium: 0 }
    );

    const warnings = await validateDayPlan(ctx, session.userId, totals);

    await ctx.db.patch(plan._id, {
      slots,
      totalCalories: totals.calories,
      totalProtein: totals.protein,
      totalFat: totals.fat,
      totalCarbs: totals.carbs,
      totalFiber: totals.fiber,
      totalSodium: totals.sodium,
      totalPotassium: totals.potassium,
      warnings,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const copyDay = mutation({
  args: {
    token: v.string(),
    sourceDate: v.string(),
    targetDate: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const sourcePlan = await ctx.db
      .query("mealPlans")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", session.userId).eq("date", args.sourceDate)
      )
      .first();

    if (!sourcePlan) {
      throw new Error("Source day has no plan");
    }

    const targetDateObj = new Date(args.targetDate);
    const now = Date.now();

    // Delete existing target plan if any
    const existingTarget = await ctx.db
      .query("mealPlans")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", session.userId).eq("date", args.targetDate)
      )
      .first();

    if (existingTarget) {
      await ctx.db.delete(existingTarget._id);
    }

    // Copy the plan
    const planId = await ctx.db.insert("mealPlans", {
      userId: session.userId,
      date: args.targetDate,
      dayOfWeek: targetDateObj.getDay(),
      slots: sourcePlan.slots,
      totalCalories: sourcePlan.totalCalories,
      totalProtein: sourcePlan.totalProtein,
      totalFat: sourcePlan.totalFat,
      totalCarbs: sourcePlan.totalCarbs,
      totalFiber: sourcePlan.totalFiber,
      totalSodium: sourcePlan.totalSodium,
      totalPotassium: sourcePlan.totalPotassium,
      warnings: sourcePlan.warnings,
      status: "planned",
      createdAt: now,
      updatedAt: now,
    });

    return { planId };
  },
});

export const markConsumed = mutation({
  args: {
    token: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const plan = await ctx.db
      .query("mealPlans")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", session.userId).eq("date", args.date)
      )
      .first();

    if (!plan) {
      throw new Error("No plan for this day");
    }

    const now = Date.now();

    // Create consumption log with snapshot
    const config = await ctx.db
      .query("nutritionConfig")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    // Build component snapshot
    const components = [];
    for (const slot of plan.slots) {
      if (slot.mealId) {
        const meal = await ctx.db.get(slot.mealId);
        if (meal) {
          for (const comp of meal.components) {
            const ing = await ctx.db.get(comp.ingredientId);
            if (ing) {
              const mult = comp.weightGrams / 100;
              components.push({
                ingredientName: ing.name,
                weightGrams: comp.weightGrams,
                calories: ing.caloriesPer100g * mult,
                protein: ing.proteinPer100g * mult,
                fat: ing.fatPer100g * mult,
                carbs: ing.carbsPer100g * mult,
              });
            }
          }
        }
      }
    }

    await ctx.db.insert("consumptionLog", {
      userId: session.userId,
      mealPlanId: plan._id,
      date: args.date,
      snapshot: {
        calories: plan.totalCalories,
        protein: plan.totalProtein,
        fat: plan.totalFat,
        carbs: plan.totalCarbs,
        fiber: plan.totalFiber,
        sodium: plan.totalSodium,
        potassium: plan.totalPotassium,
        components,
      },
      configSnapshot: {
        caloricCeiling: config?.caloricCeiling ?? 1650,
        proteinTarget: config?.proteinTarget ?? 120,
        fatTarget: config?.fatTarget ?? 120,
        netCarbLimit: config?.netCarbLimit ?? 25,
      },
      consumedAt: now,
    });

    await ctx.db.patch(plan._id, {
      status: "consumed",
      consumedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});
