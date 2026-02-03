"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

const USDA_API_KEY = process.env.USDA_API_KEY;
const USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1";

interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  value: number;
  unitName: string;
}

interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  foodNutrients: USDANutrient[];
}

interface USDASearchResponse {
  foods: USDAFood[];
  totalHits: number;
  currentPage: number;
  totalPages: number;
}

// Nutrient IDs from USDA
const NUTRIENT_IDS = {
  ENERGY: 1008, // Calories
  PROTEIN: 1003,
  FAT: 1004,
  CARBS: 1005,
  FIBER: 1079,
  SODIUM: 1093,
  POTASSIUM: 1092,
};

function extractNutrient(nutrients: USDANutrient[], nutrientId: number): number {
  const nutrient = nutrients.find((n) => n.nutrientId === nutrientId);
  return nutrient?.value ?? 0;
}

export const searchFoods = action({
  args: {
    query: v.string(),
    pageSize: v.optional(v.number()),
    dataType: v.optional(v.string()), // "Foundation", "SR Legacy", "Branded", etc.
  },
  handler: async (ctx, args) => {
    if (!USDA_API_KEY) {
      throw new Error("USDA API key not configured");
    }

    const params = new URLSearchParams({
      api_key: USDA_API_KEY,
      query: args.query,
      pageSize: String(args.pageSize ?? 25),
    });

    if (args.dataType) {
      params.append("dataType", args.dataType);
    }

    const response = await fetch(`${USDA_BASE_URL}/foods/search?${params}`);
    
    if (!response.ok) {
      throw new Error(`USDA API error: ${response.status}`);
    }

    const data: USDASearchResponse = await response.json();

    // Transform to our format
    const foods = data.foods.map((food) => ({
      fdcId: food.fdcId,
      name: food.description,
      dataType: food.dataType,
      brandOwner: food.brandOwner,
      // Nutritional data per 100g
      caloriesPer100g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.ENERGY),
      proteinPer100g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.PROTEIN),
      fatPer100g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.FAT),
      carbsPer100g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.CARBS),
      fiberPer100g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.FIBER),
      sodiumPer100g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.SODIUM),
      potassiumPer100g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.POTASSIUM),
    }));

    return {
      foods,
      totalHits: data.totalHits,
      currentPage: data.currentPage,
      totalPages: data.totalPages,
    };
  },
});

export const getFoodDetails = action({
  args: {
    fdcId: v.number(),
  },
  handler: async (ctx, args) => {
    if (!USDA_API_KEY) {
      throw new Error("USDA API key not configured");
    }

    const response = await fetch(
      `${USDA_BASE_URL}/food/${args.fdcId}?api_key=${USDA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`USDA API error: ${response.status}`);
    }

    const food: USDAFood = await response.json();

    return {
      fdcId: food.fdcId,
      name: food.description,
      dataType: food.dataType,
      caloriesPer100g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.ENERGY),
      proteinPer100g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.PROTEIN),
      fatPer100g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.FAT),
      carbsPer100g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.CARBS),
      fiberPer100g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.FIBER),
      sodiumPer100g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.SODIUM),
      potassiumPer100g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.POTASSIUM),
    };
  },
});
