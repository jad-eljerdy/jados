import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Pre-compiled USDA data for keto essentials
const KETO_STAPLES = [
  // === PROTEINS ===
  { name: "Chicken Breast (raw)", category: "protein", cal: 120, p: 22.5, f: 2.6, c: 0, fiber: 0, na: 45, k: 370, tags: ["renal_safe"] },
  { name: "Chicken Thigh (raw)", category: "protein", cal: 177, p: 19.7, f: 10.9, c: 0, fiber: 0, na: 84, k: 222, tags: [] },
  { name: "Ground Beef 80/20 (raw)", category: "protein", cal: 254, p: 17.2, f: 20, c: 0, fiber: 0, na: 75, k: 270, tags: [] },
  { name: "Ground Beef 90/10 (raw)", category: "protein", cal: 176, p: 20, f: 10, c: 0, fiber: 0, na: 66, k: 315, tags: ["renal_safe"] },
  { name: "Ribeye Steak (raw)", category: "protein", cal: 291, p: 18.6, f: 23.7, c: 0, fiber: 0, na: 59, k: 284, tags: [] },
  { name: "Salmon Fillet (raw)", category: "protein", cal: 208, p: 20.4, f: 13.4, c: 0, fiber: 0, na: 59, k: 363, tags: ["renal_safe", "high_potassium"] },
  { name: "Tuna Steak (raw)", category: "protein", cal: 109, p: 24, f: 0.5, c: 0, fiber: 0, na: 45, k: 323, tags: ["renal_safe"] },
  { name: "Shrimp (raw)", category: "protein", cal: 85, p: 20.1, f: 0.5, c: 0, fiber: 0, na: 119, k: 182, tags: ["renal_safe"] },
  { name: "Pork Tenderloin (raw)", category: "protein", cal: 120, p: 22.2, f: 3.0, c: 0, fiber: 0, na: 53, k: 399, tags: ["renal_safe"] },
  { name: "Pork Belly (raw)", category: "protein", cal: 518, p: 9.3, f: 53, c: 0, fiber: 0, na: 32, k: 127, tags: [] },
  { name: "Bacon (raw)", category: "protein", cal: 417, p: 13, f: 40, c: 1.3, fiber: 0, na: 662, k: 198, tags: ["high_sodium"] },
  { name: "Lamb Chop (raw)", category: "protein", cal: 282, p: 16.6, f: 23.4, c: 0, fiber: 0, na: 59, k: 264, tags: [] },
  { name: "Turkey Breast (raw)", category: "protein", cal: 104, p: 24.6, f: 0.6, c: 0, fiber: 0, na: 46, k: 293, tags: ["renal_safe"] },
  { name: "Duck Breast (raw)", category: "protein", cal: 132, p: 19.3, f: 5.9, c: 0, fiber: 0, na: 63, k: 271, tags: [] },
  { name: "Eggs (whole, raw)", category: "protein", cal: 143, p: 12.6, f: 9.5, c: 0.7, fiber: 0, na: 142, k: 138, tags: ["renal_safe"] },
  
  // === FATS ===
  { name: "Olive Oil (extra virgin)", category: "fat", cal: 884, p: 0, f: 100, c: 0, fiber: 0, na: 2, k: 1, tags: [], pantry: true },
  { name: "Avocado Oil", category: "fat", cal: 884, p: 0, f: 100, c: 0, fiber: 0, na: 1, k: 0, tags: [], pantry: true },
  { name: "Coconut Oil", category: "fat", cal: 892, p: 0, f: 99, c: 0, fiber: 0, na: 0, k: 0, tags: [], pantry: true },
  { name: "Butter (unsalted)", category: "fat", cal: 717, p: 0.9, f: 81, c: 0.1, fiber: 0, na: 11, k: 24, tags: [], pantry: true },
  { name: "Ghee", category: "fat", cal: 900, p: 0, f: 100, c: 0, fiber: 0, na: 0, k: 0, tags: [], pantry: true },
  { name: "MCT Oil", category: "fat", cal: 864, p: 0, f: 100, c: 0, fiber: 0, na: 0, k: 0, tags: [], pantry: true },
  { name: "Avocado (whole)", category: "fat", cal: 160, p: 2, f: 15, c: 9, fiber: 7, na: 7, k: 485, tags: ["high_potassium"] },
  { name: "Cream Cheese", category: "fat", cal: 342, p: 6, f: 34, c: 4.1, fiber: 0, na: 321, k: 132, tags: [] },
  { name: "Heavy Cream", category: "fat", cal: 340, p: 2.1, f: 36, c: 2.8, fiber: 0, na: 38, k: 95, tags: [] },
  { name: "Sour Cream", category: "fat", cal: 193, p: 2.4, f: 19.4, c: 4.6, fiber: 0, na: 53, k: 141, tags: [] },
  { name: "Mayonnaise", category: "fat", cal: 680, p: 1, f: 75, c: 0.6, fiber: 0, na: 635, k: 20, tags: ["high_sodium"], pantry: true },
  
  // === CHEESES ===
  { name: "Cheddar Cheese", category: "fat", cal: 403, p: 23, f: 33, c: 1.3, fiber: 0, na: 621, k: 76, tags: ["high_sodium"] },
  { name: "Parmesan Cheese", category: "fat", cal: 431, p: 38, f: 29, c: 4.1, fiber: 0, na: 1529, k: 92, tags: ["high_sodium"] },
  { name: "Mozzarella Cheese", category: "fat", cal: 280, p: 28, f: 17, c: 3.1, fiber: 0, na: 627, k: 95, tags: [] },
  { name: "Feta Cheese", category: "fat", cal: 264, p: 14, f: 21, c: 4.1, fiber: 0, na: 917, k: 62, tags: ["high_sodium"] },
  { name: "Brie Cheese", category: "fat", cal: 334, p: 21, f: 28, c: 0.5, fiber: 0, na: 629, k: 152, tags: [] },
  { name: "Goat Cheese", category: "fat", cal: 364, p: 22, f: 30, c: 0.1, fiber: 0, na: 515, k: 158, tags: [] },
  
  // === VEGETABLES (low-carb) ===
  { name: "Spinach (raw)", category: "vegetable", cal: 23, p: 2.9, f: 0.4, c: 3.6, fiber: 2.2, na: 79, k: 558, tags: ["high_potassium", "renal_safe"] },
  { name: "Kale (raw)", category: "vegetable", cal: 35, p: 2.9, f: 0.5, c: 6.7, fiber: 4.1, na: 43, k: 348, tags: ["high_potassium"] },
  { name: "Broccoli (raw)", category: "vegetable", cal: 34, p: 2.8, f: 0.4, c: 7, fiber: 2.6, na: 33, k: 316, tags: ["high_potassium", "renal_safe"] },
  { name: "Cauliflower (raw)", category: "vegetable", cal: 25, p: 1.9, f: 0.3, c: 5, fiber: 2, na: 30, k: 299, tags: ["renal_safe"] },
  { name: "Zucchini (raw)", category: "vegetable", cal: 17, p: 1.2, f: 0.3, c: 3.1, fiber: 1, na: 8, k: 261, tags: ["renal_safe"] },
  { name: "Asparagus (raw)", category: "vegetable", cal: 20, p: 2.2, f: 0.1, c: 3.9, fiber: 2.1, na: 2, k: 202, tags: ["renal_safe"] },
  { name: "Green Beans (raw)", category: "vegetable", cal: 31, p: 1.8, f: 0.1, c: 7, fiber: 2.7, na: 6, k: 211, tags: ["renal_safe"] },
  { name: "Bell Pepper (raw)", category: "vegetable", cal: 26, p: 1, f: 0.3, c: 6, fiber: 2.1, na: 4, k: 211, tags: ["renal_safe"] },
  { name: "Mushrooms (raw)", category: "vegetable", cal: 22, p: 3.1, f: 0.3, c: 3.3, fiber: 1, na: 5, k: 318, tags: ["renal_safe"] },
  { name: "Celery (raw)", category: "vegetable", cal: 14, p: 0.7, f: 0.2, c: 3, fiber: 1.6, na: 80, k: 260, tags: ["renal_safe"] },
  { name: "Cucumber (raw)", category: "vegetable", cal: 15, p: 0.7, f: 0.1, c: 3.6, fiber: 0.5, na: 2, k: 147, tags: ["renal_safe"] },
  { name: "Lettuce Romaine (raw)", category: "vegetable", cal: 17, p: 1.2, f: 0.3, c: 3.3, fiber: 2.1, na: 8, k: 247, tags: ["renal_safe"] },
  { name: "Cabbage (raw)", category: "vegetable", cal: 25, p: 1.3, f: 0.1, c: 5.8, fiber: 2.5, na: 18, k: 170, tags: ["renal_safe"] },
  { name: "Brussels Sprouts (raw)", category: "vegetable", cal: 43, p: 3.4, f: 0.3, c: 9, fiber: 3.8, na: 25, k: 389, tags: ["high_potassium"] },
  { name: "Arugula (raw)", category: "vegetable", cal: 25, p: 2.6, f: 0.7, c: 3.7, fiber: 1.6, na: 27, k: 369, tags: ["high_potassium"] },
  { name: "Bok Choy (raw)", category: "vegetable", cal: 13, p: 1.5, f: 0.2, c: 2.2, fiber: 1, na: 65, k: 252, tags: ["renal_safe"] },
  
  // === CONDIMENTS ===
  { name: "Soy Sauce (low sodium)", category: "condiment", cal: 53, p: 5.5, f: 0, c: 4.9, fiber: 0.4, na: 3333, k: 212, tags: ["high_sodium"], pantry: true },
  { name: "Fish Sauce", category: "condiment", cal: 35, p: 5, f: 0, c: 3.6, fiber: 0, na: 7850, k: 390, tags: ["high_sodium"], pantry: true },
  { name: "Hot Sauce (Frank's)", category: "condiment", cal: 0, p: 0, f: 0, c: 0, fiber: 0, na: 2400, k: 0, tags: ["high_sodium"], pantry: true },
  { name: "Mustard (yellow)", category: "condiment", cal: 66, p: 4.4, f: 4, c: 5.3, fiber: 3.3, na: 1135, k: 152, tags: ["high_sodium"], pantry: true },
  { name: "Dijon Mustard", category: "condiment", cal: 66, p: 3.9, f: 3.3, c: 5.8, fiber: 2.8, na: 1135, k: 138, tags: ["high_sodium"], pantry: true },
  { name: "Apple Cider Vinegar", category: "condiment", cal: 21, p: 0, f: 0, c: 0.9, fiber: 0, na: 5, k: 73, tags: [], pantry: true },
  { name: "Red Wine Vinegar", category: "condiment", cal: 19, p: 0, f: 0, c: 0.3, fiber: 0, na: 8, k: 39, tags: [], pantry: true },
  { name: "Balsamic Vinegar", category: "condiment", cal: 88, p: 0.5, f: 0, c: 17, fiber: 0, na: 23, k: 112, tags: [], pantry: true },
  { name: "Lemon Juice", category: "condiment", cal: 22, p: 0.4, f: 0.2, c: 6.9, fiber: 0.3, na: 1, k: 103, tags: [], pantry: true },
  { name: "Lime Juice", category: "condiment", cal: 25, p: 0.4, f: 0.1, c: 8.4, fiber: 0.4, na: 2, k: 117, tags: [], pantry: true },
  { name: "Tahini", category: "condiment", cal: 595, p: 17, f: 54, c: 21, fiber: 9.3, na: 115, k: 414, tags: [], pantry: true },
  { name: "Pesto (basil)", category: "condiment", cal: 490, p: 5, f: 48, c: 6, fiber: 1.6, na: 750, k: 160, tags: ["high_sodium"], pantry: true },
  
  // === SPICES (per 100g, but used in small amounts) ===
  { name: "Salt (table)", category: "spice", cal: 0, p: 0, f: 0, c: 0, fiber: 0, na: 38758, k: 8, tags: ["high_sodium"], pantry: true },
  { name: "Black Pepper (ground)", category: "spice", cal: 251, p: 10.4, f: 3.3, c: 64, fiber: 25, na: 20, k: 1329, tags: [], pantry: true },
  { name: "Garlic Powder", category: "spice", cal: 331, p: 16.6, f: 0.7, c: 73, fiber: 9, na: 60, k: 1193, tags: [], pantry: true },
  { name: "Onion Powder", category: "spice", cal: 341, p: 10.4, f: 1, c: 79, fiber: 15, na: 73, k: 985, tags: [], pantry: true },
  { name: "Paprika", category: "spice", cal: 282, p: 14.1, f: 13, c: 54, fiber: 35, na: 68, k: 2280, tags: [], pantry: true },
  { name: "Cumin (ground)", category: "spice", cal: 375, p: 18, f: 22, c: 44, fiber: 11, na: 168, k: 1788, tags: [], pantry: true },
  { name: "Oregano (dried)", category: "spice", cal: 265, p: 9, f: 4.3, c: 69, fiber: 43, na: 25, k: 1260, tags: [], pantry: true },
  { name: "Thyme (dried)", category: "spice", cal: 276, p: 9.1, f: 7.4, c: 64, fiber: 37, na: 55, k: 814, tags: [], pantry: true },
  { name: "Rosemary (dried)", category: "spice", cal: 331, p: 4.9, f: 15, c: 64, fiber: 43, na: 50, k: 955, tags: [], pantry: true },
  { name: "Cayenne Pepper", category: "spice", cal: 318, p: 12, f: 17, c: 57, fiber: 27, na: 30, k: 2014, tags: [], pantry: true },
  { name: "Turmeric (ground)", category: "spice", cal: 312, p: 9.7, f: 3.2, c: 67, fiber: 22, na: 27, k: 2080, tags: [], pantry: true },
  { name: "Cinnamon (ground)", category: "spice", cal: 247, p: 4, f: 1.2, c: 81, fiber: 53, na: 10, k: 431, tags: [], pantry: true },
  { name: "Italian Seasoning", category: "spice", cal: 265, p: 9, f: 4.3, c: 69, fiber: 43, na: 25, k: 1200, tags: [], pantry: true },
  { name: "Chili Powder", category: "spice", cal: 282, p: 13.5, f: 14, c: 50, fiber: 35, na: 1010, k: 1916, tags: ["high_sodium"], pantry: true },
  
  // === NUTS & SEEDS (keto snacks) ===
  { name: "Almonds (raw)", category: "fat", cal: 579, p: 21, f: 50, c: 22, fiber: 12.5, na: 1, k: 733, tags: ["high_potassium"] },
  { name: "Macadamia Nuts", category: "fat", cal: 718, p: 8, f: 76, c: 14, fiber: 9, na: 5, k: 368, tags: [] },
  { name: "Pecans", category: "fat", cal: 691, p: 9, f: 72, c: 14, fiber: 10, na: 0, k: 410, tags: [] },
  { name: "Walnuts", category: "fat", cal: 654, p: 15, f: 65, c: 14, fiber: 7, na: 2, k: 441, tags: [] },
  { name: "Chia Seeds", category: "fat", cal: 486, p: 17, f: 31, c: 42, fiber: 34, na: 16, k: 407, tags: [] },
  { name: "Flax Seeds", category: "fat", cal: 534, p: 18, f: 42, c: 29, fiber: 27, na: 30, k: 813, tags: ["high_potassium"] },
  { name: "Pumpkin Seeds", category: "fat", cal: 559, p: 30, f: 49, c: 11, fiber: 6, na: 7, k: 809, tags: ["high_potassium"] },
  { name: "Sunflower Seeds", category: "fat", cal: 584, p: 21, f: 51, c: 20, fiber: 9, na: 9, k: 645, tags: [] },
  
  // === MISC KETO ESSENTIALS ===
  { name: "Garlic (raw)", category: "vegetable", cal: 149, p: 6.4, f: 0.5, c: 33, fiber: 2.1, na: 17, k: 401, tags: [], pantry: true },
  { name: "Ginger (raw)", category: "vegetable", cal: 80, p: 1.8, f: 0.8, c: 18, fiber: 2, na: 13, k: 415, tags: [], pantry: true },
  { name: "Onion (raw)", category: "vegetable", cal: 40, p: 1.1, f: 0.1, c: 9.3, fiber: 1.7, na: 4, k: 146, tags: [] },
  { name: "Shallots (raw)", category: "vegetable", cal: 72, p: 2.5, f: 0.1, c: 17, fiber: 3.2, na: 12, k: 334, tags: [] },
  { name: "Jalapeño Pepper", category: "vegetable", cal: 29, p: 0.9, f: 0.4, c: 6.5, fiber: 2.8, na: 3, k: 248, tags: [] },
  { name: "Coconut Milk (canned)", category: "fat", cal: 197, p: 2.2, f: 21, c: 3, fiber: 0, na: 13, k: 220, tags: [], pantry: true },
  { name: "Almond Flour", category: "other", cal: 571, p: 21, f: 50, c: 20, fiber: 10, na: 1, k: 659, tags: [], pantry: true },
  { name: "Coconut Flour", category: "other", cal: 400, p: 13, f: 13, c: 60, fiber: 39, na: 37, k: 447, tags: [], pantry: true },
  { name: "Psyllium Husk", category: "other", cal: 200, p: 0, f: 0, c: 89, fiber: 78, na: 36, k: 260, tags: [], pantry: true },
  { name: "Erythritol", category: "other", cal: 0, p: 0, f: 0, c: 100, fiber: 0, na: 0, k: 0, tags: [], pantry: true },
  { name: "Stevia", category: "other", cal: 0, p: 0, f: 0, c: 0, fiber: 0, na: 0, k: 0, tags: [], pantry: true },
  { name: "Bone Broth (chicken)", category: "other", cal: 15, p: 3, f: 0.5, c: 0, fiber: 0, na: 360, k: 150, tags: [] },
  { name: "Collagen Peptides", category: "other", cal: 350, p: 90, f: 0, c: 0, fiber: 0, na: 90, k: 30, tags: ["renal_safe"] },
];

export const seedKetoStaples = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const now = Date.now();
    let imported = 0;
    let skipped = 0;

    for (const item of KETO_STAPLES) {
      // Check if already exists
      const existing = await ctx.db
        .query("ingredients")
        .withIndex("by_user_name", (q) =>
          q.eq("userId", session.userId).eq("name", item.name)
        )
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("ingredients", {
        userId: session.userId,
        name: item.name,
        category: item.category,
        caloriesPer100g: item.cal,
        proteinPer100g: item.p,
        fatPer100g: item.f,
        carbsPer100g: item.c,
        fiberPer100g: item.fiber,
        sodiumPer100g: item.na,
        potassiumPer100g: item.k,
        medicalTags: item.tags || [],
        preparationMethods: [],
        isPantryEssential: item.pantry || false,
        isCooked: false,
        createdAt: now,
        updatedAt: now,
      });
      imported++;
    }

    return { imported, skipped, total: KETO_STAPLES.length };
  },
});
