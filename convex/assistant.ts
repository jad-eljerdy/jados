import { v } from "convex/values";
import { mutation, query, action, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";

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

// Internal query to get user's API config
export const _getApiConfig = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<{ provider: string; apiKey: string; model: string } | null> => {
    const settings = await ctx.db
      .query("globalSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!settings?.aiApiKey) return null;

    return {
      provider: settings.aiProvider ?? "openrouter",
      apiKey: settings.aiApiKey,
      model: settings.aiModel ?? "anthropic/claude-sonnet-4-20250514",
    };
  },
});

// Chat action - calls OpenRouter API
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
  handler: async (ctx, args): Promise<{ success: boolean; needsSetup?: boolean; error?: string }> => {
    // Get session to find user
    const session = await ctx.runQuery(api.auth.getSession, { token: args.token });
    if (!session) throw new Error("Invalid session");

    // Get API config
    const apiConfig = await ctx.runQuery(internal.assistant._getApiConfig, { 
      userId: session.userId 
    });

    // Store user message
    await ctx.runMutation(api.assistant.sendMessage, {
      token: args.token,
      sessionId: args.sessionId,
      role: "user",
      content: args.message,
      context: args.context,
    });

    if (!apiConfig?.apiKey) {
      // No API key configured - show setup message
      await ctx.runMutation(api.assistant.sendMessage, {
        token: args.token,
        sessionId: args.sessionId,
        role: "assistant",
        content: "⚙️ I'm not configured yet! Go to **Settings** and add your OpenRouter API key to enable me.\n\nGet a key at: https://openrouter.ai/keys",
      });
      return { success: true, needsSetup: true };
    }

    // Get conversation history
    const history = await ctx.runQuery(api.assistant.getMessages, {
      token: args.token,
      sessionId: args.sessionId,
    });

    // Build system prompt
    const systemPrompt = buildSystemPrompt(args.context);

    // Build messages
    const messages = history.slice(-10).map((msg: any) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // Call OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiConfig.apiKey}`,
        "HTTP-Referer": "https://jados.app",
        "X-Title": "JadOS Nutrition Assistant",
      },
      body: JSON.stringify({
        model: apiConfig.model,
        max_tokens: 500,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenRouter API error:", error);
      
      await ctx.runMutation(api.assistant.sendMessage, {
        token: args.token,
        sessionId: args.sessionId,
        role: "assistant",
        content: "Sorry, I encountered an error. Please check your API key in Settings.",
      });
      return { success: false, error };
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content ?? "I couldn't generate a response.";

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
  let prompt = `You are a helpful nutrition assistant for JadOS. You help build balanced keto meals. Be concise (2-3 sentences max).

**User's Protocol:**
- Renal-Safe Keto OMAD
- Caloric ceiling: ${context.targets?.caloricCeiling ?? 1650} kcal
- Protein target: ${context.targets?.proteinTarget ?? 120}g
- Fat target: ${context.targets?.fatTarget ?? 120}g
- Net carbs limit: ${context.targets?.netCarbLimit ?? 25}g

**Current view:** ${context.view}
`;

  if (context.view === "meal_creation") {
    prompt += `\n**Meal:** ${context.mealName || "(unnamed)"}`;

    if (context.components && context.components.length > 0) {
      prompt += `\n**Ingredients added:**`;
      context.components.forEach((c: any) => {
        prompt += `\n- ${c.ingredientName}: ${c.weightGrams}g (${Math.round(c.calories)} cal, ${Math.round(c.protein)}g P)`;
      });
    } else {
      prompt += `\n**No ingredients added yet.**`;
    }

    if (context.totals) {
      const t = context.totals;
      const targets = context.targets || { caloricCeiling: 1650, proteinTarget: 120, fatTarget: 120, netCarbLimit: 25 };
      prompt += `\n\n**Current totals:**
- Calories: ${Math.round(t.calories)} / ${targets.caloricCeiling} (${Math.round(t.calories / targets.caloricCeiling * 100)}%)
- Protein: ${Math.round(t.protein)}g / ${targets.proteinTarget}g (${Math.round(t.protein / targets.proteinTarget * 100)}%)
- Fat: ${Math.round(t.fat)}g / ${targets.fatTarget}g
- Carbs: ${Math.round(t.carbs)}g / ${targets.netCarbLimit}g`;
    }

    if (context.availableIngredients && context.availableIngredients.length > 0) {
      const byCategory: Record<string, string[]> = {};
      context.availableIngredients.forEach((ing: any) => {
        if (!byCategory[ing.category]) byCategory[ing.category] = [];
        byCategory[ing.category].push(ing.name);
      });
      prompt += `\n\n**Available ingredients:**`;
      Object.entries(byCategory).forEach(([cat, items]) => {
        prompt += `\n${cat}: ${items.slice(0, 8).join(", ")}${items.length > 8 ? ` (+${items.length - 8} more)` : ""}`;
      });
    }
  }

  return prompt;
}
