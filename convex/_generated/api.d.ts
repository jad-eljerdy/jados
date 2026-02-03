/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as assistant from "../assistant.js";
import type * as auth from "../auth.js";
import type * as functions from "../functions.js";
import type * as globalSettings from "../globalSettings.js";
import type * as ingredients from "../ingredients.js";
import type * as mealPlans from "../mealPlans.js";
import type * as meals from "../meals.js";
import type * as nutritionConfig from "../nutritionConfig.js";
import type * as seed from "../seed.js";
import type * as seedIngredients from "../seedIngredients.js";
import type * as shoppingList from "../shoppingList.js";
import type * as usda from "../usda.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  assistant: typeof assistant;
  auth: typeof auth;
  functions: typeof functions;
  globalSettings: typeof globalSettings;
  ingredients: typeof ingredients;
  mealPlans: typeof mealPlans;
  meals: typeof meals;
  nutritionConfig: typeof nutritionConfig;
  seed: typeof seed;
  seedIngredients: typeof seedIngredients;
  shoppingList: typeof shoppingList;
  usda: typeof usda;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
