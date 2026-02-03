import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

// Store chat messages
export const sendMessage = mutation({
  args: {
    token: v.string(),
    sessionId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    context: v.optional(v.any()),
    status: v.optional(v.union(v.literal("pending"), v.literal("responded"))),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const messageId = await ctx.db.insert("assistantMessages", {
      userId: session.userId,
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      context: args.context,
      status: args.status ?? (args.role === "user" ? "pending" : "responded"),
      createdAt: Date.now(),
    });

    return messageId;
  },
});

export const getMessages = query({
  args: {
    token: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return [];

    return await ctx.db
      .query("assistantMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
  },
});

export const clearSession = mutation({
  args: {
    token: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const messages = await ctx.db
      .query("assistantMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    return { deleted: messages.length };
  },
});

// Send a message and store it as pending for Clawdbot to respond
export const chat = mutation({
  args: {
    token: v.string(),
    sessionId: v.string(),
    message: v.string(),
    context: v.object({
      view: v.string(),
      mealName: v.optional(v.string()),
      components: v.optional(v.array(v.object({
        ingredientName: v.string(),
        weightGrams: v.number(),
        slot: v.string(),
        calories: v.number(),
        protein: v.number(),
        fat: v.number(),
        carbs: v.number(),
      }))),
      totals: v.optional(v.object({
        calories: v.number(),
        protein: v.number(),
        fat: v.number(),
        carbs: v.number(),
      })),
      targets: v.optional(v.object({
        caloricCeiling: v.number(),
        proteinTarget: v.number(),
        fatTarget: v.number(),
        netCarbLimit: v.number(),
      })),
      availableIngredients: v.optional(v.array(v.object({
        name: v.string(),
        category: v.string(),
        caloriesPer100g: v.number(),
        proteinPer100g: v.number(),
        fatPer100g: v.number(),
        carbsPer100g: v.number(),
      }))),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    // Store user message as pending
    const messageId = await ctx.db.insert("assistantMessages", {
      userId: session.userId,
      sessionId: args.sessionId,
      role: "user",
      content: args.message,
      context: args.context,
      status: "pending",
      createdAt: Date.now(),
    });

    return { messageId, status: "pending" };
  },
});

// Get pending messages for Clawdbot to respond to
export const getPendingMessages = query({
  args: {
    secret: v.optional(v.string()), // Simple auth for Clawdbot (optional for now)
  },
  handler: async (ctx, args) => {
    // Verify secret matches if configured
    const expectedSecret = process.env.CLAWDBOT_SECRET;
    if (expectedSecret && args.secret !== expectedSecret) {
      return [];
    }

    return await ctx.db
      .query("assistantMessages")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc")
      .take(10);
  },
});

// Clawdbot responds to a pending message
export const respondToMessage = mutation({
  args: {
    secret: v.optional(v.string()),
    messageId: v.id("assistantMessages"),
    response: v.string(),
  },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.CLAWDBOT_SECRET;
    if (expectedSecret && args.secret !== expectedSecret) {
      throw new Error("Invalid secret");
    }

    // Get the original message
    const original = await ctx.db.get(args.messageId);
    if (!original) throw new Error("Message not found");

    // Mark original as responded
    await ctx.db.patch(args.messageId, { status: "responded" });

    // Store assistant response
    await ctx.db.insert("assistantMessages", {
      userId: original.userId,
      sessionId: original.sessionId,
      role: "assistant",
      content: args.response,
      status: "responded",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Helper to format context for display
export function formatContextForAssistant(context: any): string {
  let prompt = `**JJ's Protocol:**
- Renal-Safe Keto OMAD (One Meal A Day)
- Caloric ceiling: ${context.targets?.caloricCeiling ?? 1650} kcal
- Protein target: ${context.targets?.proteinTarget ?? 120}g
- Fat target: ${context.targets?.fatTarget ?? 120}g
- Net carbs limit: ${context.targets?.netCarbLimit ?? 25}g

**Current view:** ${context.view}
`;

  if (context.view === "meal_creation") {
    prompt += `\n**Meal being built:** ${context.mealName || "(unnamed)"}`;

    if (context.components && context.components.length > 0) {
      prompt += `\n**Ingredients:**\n`;
      context.components.forEach((c: any) => {
        prompt += `- ${c.ingredientName}: ${c.weightGrams}g (${Math.round(c.calories)} cal, ${Math.round(c.protein)}g P)\n`;
      });
    }

    if (context.totals) {
      prompt += `\n**Current totals:** ${Math.round(context.totals.calories)} cal, ${Math.round(context.totals.protein)}g P, ${Math.round(context.totals.fat)}g F, ${Math.round(context.totals.carbs)}g C`;
    }

    if (context.availableIngredients && context.availableIngredients.length > 0) {
      const byCategory: Record<string, string[]> = {};
      context.availableIngredients.forEach((ing: any) => {
        if (!byCategory[ing.category]) byCategory[ing.category] = [];
        byCategory[ing.category].push(ing.name);
      });
      prompt += `\n\n**Available ingredients:**\n`;
      Object.entries(byCategory).forEach(([cat, items]) => {
        prompt += `${cat}: ${items.slice(0, 5).join(", ")}${items.length > 5 ? ` (+${items.length - 5} more)` : ""}\n`;
      });
    }
  }

  return prompt;
}
