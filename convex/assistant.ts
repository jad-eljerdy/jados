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

// Action to call Claude API
export const chat = action({
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
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Store user message
      await ctx.runMutation(api.assistant.sendMessage, {
        token: args.token,
        sessionId: args.sessionId,
        role: "user",
        content: args.message,
        context: args.context,
      });
      
      // Return fallback message
      await ctx.runMutation(api.assistant.sendMessage, {
        token: args.token,
        sessionId: args.sessionId,
        role: "assistant",
        content: "I'm not fully connected yet! Add ANTHROPIC_API_KEY to your Convex environment variables to enable me. In the meantime, here are some tips:\n\n• Aim for 120-150g protein anchor (chicken, beef, fish)\n• Add 30-50g fat source if needed\n• Include 100-200g low-carb vegetables\n• Keep net carbs under 25g total",
      });
      
      return { success: true, fallback: true };
    }

    // Store user message
    await ctx.runMutation(api.assistant.sendMessage, {
      token: args.token,
      sessionId: args.sessionId,
      role: "user",
      content: args.message,
      context: args.context,
    });

    // Get conversation history
    const history = await ctx.runQuery(api.assistant.getMessages, {
      token: args.token,
      sessionId: args.sessionId,
    });

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(args.context);

    // Build messages for Claude
    const messages = history.slice(-10).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // Call Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Claude API error:", error);
      throw new Error("Failed to get response from assistant");
    }

    const data = await response.json();
    const assistantMessage = data.content[0].text;

    // Store assistant response
    await ctx.runMutation(api.assistant.sendMessage, {
      token: args.token,
      sessionId: args.sessionId,
      role: "assistant",
      content: assistantMessage,
    });

    return { success: true };
  },
});

function buildSystemPrompt(context: any): string {
  let prompt = `You are Son of Anton, JJ's personal nutrition assistant embedded in JadOS. You're helpful, concise, and know JJ's dietary requirements:

**JJ's Protocol:**
- Renal-Safe Keto OMAD (One Meal A Day)
- Caloric ceiling: ${context.targets?.caloricCeiling ?? 1650} kcal
- Protein target: ${context.targets?.proteinTarget ?? 120}g (important for muscle, but watch kidneys)
- Fat target: ${context.targets?.fatTarget ?? 120}g
- Net carbs limit: ${context.targets?.netCarbLimit ?? 25}g
- Hypertension management: watch sodium, aim for potassium-rich foods

**Your role:**
- Help build balanced keto meals
- Suggest ingredients and portions
- Flag if macros are off target
- Be proactive with suggestions
- Keep responses SHORT (2-4 sentences max unless asked for detail)

**Current view:** ${context.view}
`;

  if (context.view === "meal_creation") {
    prompt += `\n**Current meal being built:**
- Name: ${context.mealName || "(unnamed)"}
- Components: ${context.components?.length ?? 0} ingredients
`;

    if (context.components && context.components.length > 0) {
      prompt += `\nIngredients added:\n`;
      context.components.forEach((c: any) => {
        prompt += `- ${c.ingredientName}: ${c.weightGrams}g (${Math.round(c.calories)} cal, ${Math.round(c.protein)}g P)\n`;
      });
    }

    if (context.totals) {
      prompt += `\n**Current totals:**
- Calories: ${Math.round(context.totals.calories)} / ${context.targets?.caloricCeiling ?? 1650}
- Protein: ${Math.round(context.totals.protein)}g / ${context.targets?.proteinTarget ?? 120}g
- Fat: ${Math.round(context.totals.fat)}g / ${context.targets?.fatTarget ?? 120}g  
- Carbs: ${Math.round(context.totals.carbs)}g / ${context.targets?.netCarbLimit ?? 25}g
`;
    }

    if (context.availableIngredients && context.availableIngredients.length > 0) {
      prompt += `\n**Available ingredients (${context.availableIngredients.length} total):**\n`;
      // Group by category and show top items
      const byCategory: Record<string, any[]> = {};
      context.availableIngredients.forEach((ing: any) => {
        if (!byCategory[ing.category]) byCategory[ing.category] = [];
        byCategory[ing.category].push(ing);
      });
      Object.entries(byCategory).forEach(([cat, items]) => {
        prompt += `${cat}: ${items.slice(0, 5).map((i: any) => i.name).join(", ")}${items.length > 5 ? ` (+${items.length - 5} more)` : ""}\n`;
      });
    }
  }

  return prompt;
}
