"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthToken } from "@/lib/auth";
import type { Id } from "../../../../convex/_generated/dataModel";

const SLOTS = ["protein_anchor", "fat_source", "micronutrient_veg", "condiment"];

export default function MealsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const token = getAuthToken();

  const meals = useQuery(api.meals.list, token ? { token } : "skip");
  const ingredients = useQuery(api.ingredients.list, token ? { token } : "skip");
  const createMeal = useMutation(api.meals.create);
  const removeMeal = useMutation(api.meals.remove);
  const toggleFavorite = useMutation(api.meals.update);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mealName, setMealName] = useState("");
  const [components, setComponents] = useState<
    Array<{ slot: string; ingredientId: string; weightGrams: number }>
  >([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  const addComponent = () => {
    setComponents([...components, { slot: "protein_anchor", ingredientId: "", weightGrams: 100 }]);
  };

  const updateComponent = (index: number, field: string, value: any) => {
    const newComponents = [...components];
    newComponents[index] = { ...newComponents[index], [field]: value };
    setComponents(newComponents);
  };

  const removeComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!token || !mealName.trim() || components.length === 0) return;
    
    const validComponents = components.filter((c) => c.ingredientId);
    if (validComponents.length === 0) return;

    setSaving(true);
    try {
      await createMeal({
        token,
        name: mealName,
        components: validComponents.map((c) => ({
          slot: c.slot,
          ingredientId: c.ingredientId as Id<"ingredients">,
          weightGrams: c.weightGrams,
        })),
        tags: [],
      });
      setShowCreateModal(false);
      setMealName("");
      setComponents([]);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFavorite = async (mealId: string, current: boolean) => {
    if (!token) return;
    await toggleFavorite({
      token,
      mealId: mealId as Id<"meals">,
      isFavorite: !current,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Calculate totals for preview
  const previewTotals = components.reduce(
    (acc, comp) => {
      const ing = ingredients?.find((i) => i._id === comp.ingredientId);
      if (!ing) return acc;
      const mult = comp.weightGrams / 100;
      return {
        calories: acc.calories + ing.caloriesPer100g * mult,
        protein: acc.protein + ing.proteinPer100g * mult,
        fat: acc.fat + ing.fatPer100g * mult,
        carbs: acc.carbs + ing.carbsPer100g * mult,
      };
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Meal Templates</h1>
              <p className="text-zinc-400">{meals?.length ?? 0} meals saved</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>+ Create Meal</Button>
          </div>

          {/* Meals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meals?.map((meal) => (
              <div key={meal._id} className="bg-zinc-900 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{meal.name}</h3>
                    <div className="text-sm text-zinc-400 mt-1">
                      {Math.round(meal.totalCalories)} kcal
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleFavorite(meal._id, meal.isFavorite)}
                    className={`text-xl ${meal.isFavorite ? "text-yellow-400" : "text-zinc-600"}`}
                  >
                    {meal.isFavorite ? "★" : "☆"}
                  </button>
                </div>

                <div className="flex gap-2 mt-3 text-sm">
                  <span className="text-blue-400">{Math.round(meal.totalProtein)}g P</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-yellow-400">{Math.round(meal.totalFat)}g F</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-green-400">{Math.round(meal.totalCarbs)}g C</span>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
                  <span className="text-xs text-zinc-500">
                    {meal.components.length} ingredients
                  </span>
                  <button
                    onClick={() => token && removeMeal({ token, mealId: meal._id })}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {(!meals || meals.length === 0) && (
              <div className="col-span-2 bg-zinc-900 rounded-xl p-8 text-center text-zinc-500">
                No meals yet. Create your first meal template!
              </div>
            )}
          </div>
        </div>

        {/* Create Meal Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
              <div className="p-6 border-b border-zinc-800">
                <h2 className="text-lg font-semibold text-white">Create Meal Template</h2>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)] space-y-4">
                <Input
                  label="Meal Name"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  placeholder="e.g., Keto Chicken Dinner"
                />

                <div className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-zinc-400">Components</span>
                    <Button variant="ghost" size="sm" onClick={addComponent}>
                      + Add Ingredient
                    </Button>
                  </div>

                  {components.map((comp, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 items-end">
                      <div className="flex-1">
                        <label className="block text-xs text-zinc-500 mb-1">Slot</label>
                        <select
                          value={comp.slot}
                          onChange={(e) => updateComponent(idx, "slot", e.target.value)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white"
                        >
                          {SLOTS.map((s) => (
                            <option key={s} value={s}>
                              {s.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-[2]">
                        <label className="block text-xs text-zinc-500 mb-1">Ingredient</label>
                        <select
                          value={comp.ingredientId}
                          onChange={(e) => updateComponent(idx, "ingredientId", e.target.value)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white"
                        >
                          <option value="">Select...</option>
                          {ingredients?.map((ing) => (
                            <option key={ing._id} value={ing._id}>
                              {ing.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="block text-xs text-zinc-500 mb-1">Grams</label>
                        <input
                          type="number"
                          value={comp.weightGrams}
                          onChange={(e) => updateComponent(idx, "weightGrams", Number(e.target.value))}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white"
                        />
                      </div>
                      <button
                        onClick={() => removeComponent(idx)}
                        className="text-red-400 hover:text-red-300 pb-1.5"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {components.length === 0 && (
                    <div className="text-sm text-zinc-500 py-4 text-center">
                      Add ingredients to build your meal
                    </div>
                  )}
                </div>

                {/* Preview */}
                {components.length > 0 && (
                  <div className="bg-zinc-800/50 rounded-lg p-4 mt-4">
                    <div className="text-sm text-zinc-400 mb-2">Preview</div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-white">{Math.round(previewTotals.calories)} kcal</span>
                      <span className="text-blue-400">{Math.round(previewTotals.protein)}g P</span>
                      <span className="text-yellow-400">{Math.round(previewTotals.fat)}g F</span>
                      <span className="text-green-400">{Math.round(previewTotals.carbs)}g C</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-zinc-800 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  loading={saving}
                  disabled={!mealName.trim() || components.length === 0}
                >
                  Create Meal
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
