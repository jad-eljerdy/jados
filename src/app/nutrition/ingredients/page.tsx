"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthToken } from "@/lib/auth";

const CATEGORIES = ["protein", "fat", "vegetable", "condiment", "spice", "other"];
const MEDICAL_TAGS = ["renal_safe", "high_potassium", "high_sodium", "low_purine"];
const PREP_METHODS = ["raw", "pan_fry", "roast", "grill", "boil", "steam", "bake"];

interface USDAFood {
  fdcId: number;
  name: string;
  dataType: string;
  brandOwner?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
  fiberPer100g: number;
  sodiumPer100g: number;
  potassiumPer100g: number;
}

export default function IngredientsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const token = getAuthToken();

  const ingredients = useQuery(api.ingredients.list, token ? { token } : "skip");
  const categories = useQuery(api.ingredients.getCategories, token ? { token } : "skip");
  const createIngredient = useMutation(api.ingredients.create);
  const importFromUSDA = useMutation(api.ingredients.importFromUSDA);
  const removeIngredient = useMutation(api.ingredients.remove);
  const searchUSDA = useAction(api.usda.searchFoods);
  const seedKetoStaples = useMutation(api.seedIngredients.seedKetoStaples);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showUSDAModal, setShowUSDAModal] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [usdaQuery, setUsdaQuery] = useState("");
  const [usdaResults, setUsdaResults] = useState<USDAFood[]>([]);
  const [usdaLoading, setUsdaLoading] = useState(false);
  const [selectedUSDA, setSelectedUSDA] = useState<USDAFood | null>(null);

  // Form state for manual add
  const [name, setName] = useState("");
  const [category, setCategory] = useState("protein");
  const [caloriesPer100g, setCaloriesPer100g] = useState(0);
  const [proteinPer100g, setProteinPer100g] = useState(0);
  const [fatPer100g, setFatPer100g] = useState(0);
  const [carbsPer100g, setCarbsPer100g] = useState(0);
  const [fiberPer100g, setFiberPer100g] = useState(0);
  const [sodiumPer100g, setSodiumPer100g] = useState(0);
  const [potassiumPer100g, setPotassiumPer100g] = useState(0);
  const [isPantryEssential, setIsPantryEssential] = useState(false);
  const [medicalTags, setMedicalTags] = useState<string[]>([]);
  const [preparationMethods, setPreparationMethods] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSeedStaples = async () => {
    if (!token) return;
    setSeeding(true);
    setSeedResult(null);
    try {
      const result = await seedKetoStaples({ token });
      setSeedResult({ imported: result.imported, skipped: result.skipped });
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  const handleUSDASearch = async () => {
    if (!usdaQuery.trim()) return;
    setUsdaLoading(true);
    try {
      const results = await searchUSDA({ query: usdaQuery, pageSize: 20 });
      setUsdaResults(results.foods);
    } catch (err) {
      console.error(err);
    } finally {
      setUsdaLoading(false);
    }
  };

  const handleImportUSDA = async () => {
    if (!selectedUSDA || !token) return;
    setSaving(true);
    try {
      await importFromUSDA({
        token,
        fdcId: selectedUSDA.fdcId,
        name: selectedUSDA.name,
        caloriesPer100g: selectedUSDA.caloriesPer100g,
        proteinPer100g: selectedUSDA.proteinPer100g,
        fatPer100g: selectedUSDA.fatPer100g,
        carbsPer100g: selectedUSDA.carbsPer100g,
        fiberPer100g: selectedUSDA.fiberPer100g,
        sodiumPer100g: selectedUSDA.sodiumPer100g,
        potassiumPer100g: selectedUSDA.potassiumPer100g,
        category,
        isPantryEssential,
        medicalTags,
        preparationMethods,
      });
      setShowUSDAModal(false);
      setSelectedUSDA(null);
      setUsdaResults([]);
      setUsdaQuery("");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleManualAdd = async () => {
    if (!token || !name.trim()) return;
    setSaving(true);
    try {
      await createIngredient({
        token,
        name,
        caloriesPer100g,
        proteinPer100g,
        fatPer100g,
        carbsPer100g,
        fiberPer100g,
        sodiumPer100g,
        potassiumPer100g,
        category,
        isPantryEssential,
        medicalTags,
        preparationMethods,
        isCooked: false,
      });
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName("");
    setCategory("protein");
    setCaloriesPer100g(0);
    setProteinPer100g(0);
    setFatPer100g(0);
    setCarbsPer100g(0);
    setFiberPer100g(0);
    setSodiumPer100g(0);
    setPotassiumPer100g(0);
    setIsPantryEssential(false);
    setMedicalTags([]);
    setPreparationMethods([]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Ingredients Database</h1>
              <p className="text-muted-foreground">
                {ingredients?.length ?? 0} ingredients •{" "}
                {categories?.map((c) => `${c.count} ${c.name}`).join(", ") || "No categories"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                onClick={handleSeedStaples} 
                loading={seeding}
                disabled={seeding}
              >
                🥩 Seed Keto Staples
              </Button>
              <Button variant="secondary" onClick={() => setShowUSDAModal(true)}>
                🔍 Search USDA
              </Button>
              <Button onClick={() => setShowAddModal(true)}>+ Add Manual</Button>
            </div>
          </div>

          {/* Seed Result */}
          {seedResult && (
            <div className="mb-4 bg-green-900/20 border border-green-700 rounded-lg p-3 text-green-400 text-sm">
              ✓ Imported {seedResult.imported} keto staples
              {seedResult.skipped > 0 && ` (${seedResult.skipped} already existed)`}
            </div>
          )}

          {/* Ingredients List */}
          <div className="bg-card rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Cal</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">P</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">F</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">C</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ingredients?.map((ing) => (
                  <tr key={ing._id} className="border-b border-border/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-foreground">{ing.name}</span>
                        {ing.isPantryEssential && (
                          <span className="ml-2 text-xs bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">
                            pantry
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{ing.category}</td>
                    <td className="px-4 py-3 text-sm text-zinc-300 text-right">{Math.round(ing.caloriesPer100g)}</td>
                    <td className="px-4 py-3 text-sm text-blue-400 text-right">{Math.round(ing.proteinPer100g)}g</td>
                    <td className="px-4 py-3 text-sm text-yellow-400 text-right">{Math.round(ing.fatPer100g)}g</td>
                    <td className="px-4 py-3 text-sm text-green-400 text-right">{Math.round(ing.carbsPer100g)}g</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => token && removeIngredient({ token, ingredientId: ing._id })}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {(!ingredients || ingredients.length === 0) && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                      No ingredients yet. Search USDA or add manually to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* USDA Search Modal */}
        {showUSDAModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Search USDA Database</h2>
                <div className="flex gap-2 mt-4">
                  <Input
                    value={usdaQuery}
                    onChange={(e) => setUsdaQuery(e.target.value)}
                    placeholder="Search foods..."
                    onKeyDown={(e) => e.key === "Enter" && handleUSDASearch()}
                  />
                  <Button onClick={handleUSDASearch} loading={usdaLoading}>
                    Search
                  </Button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[400px]">
                {usdaResults.map((food) => (
                  <div
                    key={food.fdcId}
                    onClick={() => setSelectedUSDA(food)}
                    className={`p-4 border-b border-border/50 cursor-pointer hover:bg-zinc-800/50 ${
                      selectedUSDA?.fdcId === food.fdcId ? "bg-green-900/20 border-l-2 border-l-green-500" : ""
                    }`}
                  >
                    <div className="text-foreground font-medium">{food.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {Math.round(food.caloriesPer100g)} cal • {Math.round(food.proteinPer100g)}g P •{" "}
                      {Math.round(food.fatPer100g)}g F • {Math.round(food.carbsPer100g)}g C
                    </div>
                    {food.brandOwner && (
                      <div className="text-xs text-zinc-500 mt-1">{food.brandOwner}</div>
                    )}
                  </div>
                ))}
              </div>

              {selectedUSDA && (
                <div className="p-6 border-t border-border space-y-4">
                  <div className="text-sm text-muted-foreground">Configure before importing:</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-foreground"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c.charAt(0).toUpperCase() + c.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isPantryEssential}
                        onChange={(e) => setIsPantryEssential(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-muted-foreground">Pantry Essential</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-6 border-t border-border flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowUSDAModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImportUSDA} disabled={!selectedUSDA} loading={saving}>
                  Import Selected
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Add Ingredient Manually</h2>
              </div>

              <div className="p-6 space-y-4">
                <Input
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Chicken Breast"
                />

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-foreground"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-sm font-medium text-muted-foreground pt-2">Nutrition per 100g (raw)</div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Calories"
                    type="number"
                    value={caloriesPer100g}
                    onChange={(e) => setCaloriesPer100g(Number(e.target.value))}
                  />
                  <Input
                    label="Protein (g)"
                    type="number"
                    value={proteinPer100g}
                    onChange={(e) => setProteinPer100g(Number(e.target.value))}
                  />
                  <Input
                    label="Fat (g)"
                    type="number"
                    value={fatPer100g}
                    onChange={(e) => setFatPer100g(Number(e.target.value))}
                  />
                  <Input
                    label="Carbs (g)"
                    type="number"
                    value={carbsPer100g}
                    onChange={(e) => setCarbsPer100g(Number(e.target.value))}
                  />
                  <Input
                    label="Fiber (g)"
                    type="number"
                    value={fiberPer100g}
                    onChange={(e) => setFiberPer100g(Number(e.target.value))}
                  />
                  <Input
                    label="Sodium (mg)"
                    type="number"
                    value={sodiumPer100g}
                    onChange={(e) => setSodiumPer100g(Number(e.target.value))}
                  />
                  <Input
                    label="Potassium (mg)"
                    type="number"
                    value={potassiumPer100g}
                    onChange={(e) => setPotassiumPer100g(Number(e.target.value))}
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    checked={isPantryEssential}
                    onChange={(e) => setIsPantryEssential(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-muted-foreground">Pantry Essential (oil, spice, etc.)</span>
                </div>
              </div>

              <div className="p-6 border-t border-border flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleManualAdd} loading={saving}>
                  Add Ingredient
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
