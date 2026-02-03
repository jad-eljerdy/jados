import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============ AUTH ============
  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  // ============ NUTRITION: GLOBAL CONFIG ============
  nutritionConfig: defineTable({
    userId: v.id("users"),
    // Caloric & Macro Targets
    caloricCeiling: v.number(), // e.g., 1650
    proteinTarget: v.number(), // e.g., 120g
    fatTarget: v.number(), // e.g., 120g
    netCarbLimit: v.number(), // e.g., 25g
    // Medical Flags
    renalProtection: v.boolean(),
    hypertensionManagement: v.boolean(),
    ketoProtocol: v.boolean(),
    // Sodium/Potassium thresholds (mg)
    sodiumDailyLimit: v.optional(v.number()),
    potassiumDailyMinimum: v.optional(v.number()),
    // Schedule Mode
    scheduleMode: v.union(v.literal("omad"), v.literal("weekend_if"), v.literal("custom")),
    // OMAD: 1 meal Mon-Fri, Weekend IF: 2 meals Sat-Sun
    weekendMealSlots: v.optional(v.number()), // e.g., 2 for weekend IF
    // Biometrics (temporary until Biology module)
    currentWeight: v.optional(v.number()), // kg
    goalWeight: v.optional(v.number()), // kg
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // ============ NUTRITION: INGREDIENTS ============
  ingredients: defineTable({
    userId: v.id("users"),
    // Basic Info
    name: v.string(),
    description: v.optional(v.string()),
    fdcId: v.optional(v.number()), // USDA FoodData Central ID
    // Nutritional Data per 100g (raw unless tagged)
    caloriesPer100g: v.number(),
    proteinPer100g: v.number(),
    fatPer100g: v.number(),
    carbsPer100g: v.number(),
    fiberPer100g: v.number(),
    sodiumPer100g: v.number(), // mg
    potassiumPer100g: v.number(), // mg
    // Attributes
    isPantryEssential: v.boolean(), // oils, spices, staples
    medicalTags: v.array(v.string()), // ["renal_safe", "high_potassium", "high_sodium", "low_purine"]
    preparationMethods: v.array(v.string()), // ["pan_fry", "raw", "roast", "boil", "grill"]
    category: v.string(), // "protein", "fat", "vegetable", "condiment", "spice"
    isCooked: v.boolean(), // true if nutritional data is for cooked weight
    yieldFactor: v.optional(v.number()), // e.g., 0.75 if 100g raw = 75g cooked
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_category", ["userId", "category"])
    .index("by_user_name", ["userId", "name"]),

  // ============ NUTRITION: MEALS (Templates) ============
  meals: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    // Modular Composition
    components: v.array(
      v.object({
        slot: v.string(), // "protein_anchor", "fat_source", "micronutrient_veg", "condiment"
        ingredientId: v.id("ingredients"),
        weightGrams: v.number(), // raw weight
        preparationMethod: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
    // Calculated totals (cached, recalculated on component change)
    totalCalories: v.number(),
    totalProtein: v.number(),
    totalFat: v.number(),
    totalCarbs: v.number(),
    totalFiber: v.number(),
    totalSodium: v.number(),
    totalPotassium: v.number(),
    // Metadata
    isFavorite: v.boolean(),
    tags: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_favorite", ["userId", "isFavorite"]),

  // ============ NUTRITION: MEAL PLANS ============
  mealPlans: defineTable({
    userId: v.id("users"),
    date: v.string(), // "2026-02-03" format
    dayOfWeek: v.number(), // 0=Sunday, 6=Saturday
    // Slots for the day
    slots: v.array(
      v.object({
        slotIndex: v.number(), // 0 for OMAD, 0-1 for weekend IF
        mealId: v.optional(v.id("meals")), // Reference to meal template
        // Or inline composition (for one-off meals)
        customComponents: v.optional(
          v.array(
            v.object({
              ingredientId: v.id("ingredients"),
              weightGrams: v.number(),
              preparationMethod: v.optional(v.string()),
            })
          )
        ),
        // Calculated totals for this slot
        calories: v.number(),
        protein: v.number(),
        fat: v.number(),
        carbs: v.number(),
        fiber: v.number(),
        sodium: v.number(),
        potassium: v.number(),
      })
    ),
    // Day totals
    totalCalories: v.number(),
    totalProtein: v.number(),
    totalFat: v.number(),
    totalCarbs: v.number(),
    totalFiber: v.number(),
    totalSodium: v.number(),
    totalPotassium: v.number(),
    // Validation state
    warnings: v.array(v.string()), // ["Exceeds caloric limit", "Below protein minimum"]
    // Status
    status: v.union(v.literal("planned"), v.literal("consumed"), v.literal("skipped")),
    consumedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"])
    .index("by_user_status", ["userId", "status"]),

  // ============ NUTRITION: CONSUMPTION LOG ============
  consumptionLog: defineTable({
    userId: v.id("users"),
    mealPlanId: v.id("mealPlans"),
    date: v.string(),
    // Snapshot of what was consumed (preserved even if meal plan changes)
    snapshot: v.object({
      calories: v.number(),
      protein: v.number(),
      fat: v.number(),
      carbs: v.number(),
      fiber: v.number(),
      sodium: v.number(),
      potassium: v.number(),
      components: v.array(
        v.object({
          ingredientName: v.string(),
          weightGrams: v.number(),
          calories: v.number(),
          protein: v.number(),
          fat: v.number(),
          carbs: v.number(),
        })
      ),
    }),
    // Config snapshot (targets at time of consumption)
    configSnapshot: v.object({
      caloricCeiling: v.number(),
      proteinTarget: v.number(),
      fatTarget: v.number(),
      netCarbLimit: v.number(),
    }),
    consumedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  // ============ NUTRITION: SHOPPING LISTS ============
  shoppingLists: defineTable({
    userId: v.id("users"),
    weekStart: v.string(), // "2026-02-03"
    weekEnd: v.string(), // "2026-02-09"
    items: v.array(
      v.object({
        ingredientId: v.id("ingredients"),
        ingredientName: v.string(),
        totalWeightGrams: v.number(),
        isPantryEssential: v.boolean(),
        category: v.string(),
        checked: v.boolean(),
      })
    ),
    generatedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_week", ["userId", "weekStart"]),

  // ============ NUTRITION: WEIGHT LOGS ============
  weightLogs: defineTable({
    userId: v.id("users"),
    date: v.string(), // "2026-02-03"
    weight: v.number(), // kg
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  // ============ GLOBAL SETTINGS ============
  globalSettings: defineTable({
    userId: v.id("users"),
    // AI Provider Settings
    aiProvider: v.optional(v.string()), // "openrouter" | "anthropic" | "openai"
    aiApiKey: v.optional(v.string()), // Encrypted or stored securely
    aiModel: v.optional(v.string()), // e.g., "anthropic/claude-3.5-sonnet", "openai/gpt-4o"
    // Other global settings can go here
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // ============ ASSISTANT: CHAT MESSAGES ============
  assistantMessages: defineTable({
    userId: v.id("users"),
    sessionId: v.string(), // Unique per chat context (e.g., "meal_creation_<timestamp>")
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    context: v.optional(v.any()), // Snapshot of context at message time
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"]),
});
