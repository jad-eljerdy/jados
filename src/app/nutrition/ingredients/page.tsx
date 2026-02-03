"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getAuthToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  Trash2,
  Loader2,
  Package,
  Sparkles,
  X,
  ChevronDown,
} from "lucide-react";

const CATEGORIES = ["protein", "fat", "vegetable", "condiment", "spice", "other"];

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
  const createIngredient = useMutation(api.ingredients.create);
  const importFromUSDA = useMutation(api.ingredients.importFromUSDA);
  const removeIngredient = useMutation(api.ingredients.remove);
  const searchUSDA = useAction(api.usda.searchFoods);
  const seedKetoStaples = useMutation(api.seedIngredients.seedKetoStaples);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUSDAModal, setShowUSDAModal] = useState(false);
  
  // Seeding
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ imported: number; skipped: number } | null>(null);

  // USDA Search
  const [usdaQuery, setUsdaQuery] = useState("");
  const [usdaResults, setUsdaResults] = useState<USDAFood[]>([]);
  const [usdaLoading, setUsdaLoading] = useState(false);
  const [selectedUSDA, setSelectedUSDA] = useState<USDAFood | null>(null);

  // Manual Add Form
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Filtered ingredients
  const filteredIngredients = useMemo(() => {
    if (!ingredients) return [];
    return ingredients.filter((ing) => {
      const matchesSearch = searchQuery === "" || 
        ing.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !categoryFilter || ing.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [ingredients, searchQuery, categoryFilter]);

  // Category counts
  const categoryCounts = useMemo(() => {
    if (!ingredients) return {};
    return ingredients.reduce((acc, ing) => {
      acc[ing.category] = (acc[ing.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [ingredients]);

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
        medicalTags: [],
        preparationMethods: [],
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
        medicalTags: [],
        preparationMethods: [],
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
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold">Ingredients</h1>
              <p className="text-sm text-muted-foreground">{ingredients?.length ?? 0} ingredients</p>
            </div>
            <div className="flex gap-2">
              {(!ingredients || ingredients.length < 20) && (
                <Button variant="outline" onClick={handleSeedStaples} loading={seeding}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Seed Staples
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowUSDAModal(true)}>
                <Search className="h-4 w-4 mr-2" />
                USDA Search
              </Button>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Manual
              </Button>
            </div>
          </div>

          {/* Seed Result */}
          {seedResult && (
            <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
              ✓ Added {seedResult.imported} ingredients
              {seedResult.skipped > 0 && ` (${seedResult.skipped} already existed)`}
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ingredients..."
                className="pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant={categoryFilter === null ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setCategoryFilter(null)}
              >
                All
              </Button>
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setCategoryFilter(cat)}
                  className="capitalize"
                >
                  {cat}
                  {categoryCounts[cat] && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {categoryCounts[cat]}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Ingredients List */}
          {filteredIngredients.length > 0 ? (
            <div className="border border-border/50 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-card/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Cal</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">P</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">F</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">C</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIngredients.map((ing, idx) => (
                    <tr
                      key={ing._id}
                      className={cn(
                        "border-b border-border/30 hover:bg-card/50 transition-colors",
                        idx === filteredIngredients.length - 1 && "border-0"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ing.name}</span>
                          {ing.isPantryEssential && (
                            <Badge variant="outline" className="text-[10px]">pantry</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground capitalize">{ing.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums">{Math.round(ing.caloriesPer100g)}</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-violet-400">{Math.round(ing.proteinPer100g)}g</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-sky-400">{Math.round(ing.fatPer100g)}g</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-teal-400">{Math.round(ing.carbsPer100g)}g</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => token && removeIngredient({ token, ingredientId: ing._id })}
                          className="p-1.5 rounded text-muted-foreground/30 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : ingredients && ingredients.length > 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p>No ingredients match your search</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground mb-4">No ingredients yet</p>
              <Button onClick={handleSeedStaples} loading={seeding}>
                <Sparkles className="h-4 w-4 mr-2" />
                Seed Keto Staples
              </Button>
            </div>
          )}
        </div>

        {/* USDA Search Modal */}
        {showUSDAModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-border">
              <div className="p-5 border-b border-border">
                <h2 className="text-lg font-semibold">Search USDA Database</h2>
                <div className="flex gap-2 mt-4">
                  <Input
                    value={usdaQuery}
                    onChange={(e) => setUsdaQuery(e.target.value)}
                    placeholder="Search foods..."
                    onKeyDown={(e) => e.key === "Enter" && handleUSDASearch()}
                    className="flex-1"
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
                    className={cn(
                      "p-4 border-b border-border/50 cursor-pointer hover:bg-secondary/50 transition-colors",
                      selectedUSDA?.fdcId === food.fdcId && "bg-primary/5 border-l-2 border-l-primary"
                    )}
                  >
                    <div className="font-medium">{food.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {Math.round(food.caloriesPer100g)} cal · {Math.round(food.proteinPer100g)}g P · {Math.round(food.fatPer100g)}g F · {Math.round(food.carbsPer100g)}g C
                    </div>
                  </div>
                ))}
              </div>

              {selectedUSDA && (
                <div className="p-5 border-t border-border space-y-4">
                  <div className="text-sm text-muted-foreground">Configure before importing:</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
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

              <div className="p-5 border-t border-border flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowUSDAModal(false)}>Cancel</Button>
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
            <div className="bg-card rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto border border-border">
              <div className="p-5 border-b border-border">
                <h2 className="text-lg font-semibold">Add Ingredient</h2>
              </div>

              <div className="p-5 space-y-4">
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
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div className="text-sm font-medium text-muted-foreground pt-2">Nutrition per 100g</div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Calories" type="number" value={caloriesPer100g} onChange={(e) => setCaloriesPer100g(Number(e.target.value))} />
                  <Input label="Protein (g)" type="number" value={proteinPer100g} onChange={(e) => setProteinPer100g(Number(e.target.value))} />
                  <Input label="Fat (g)" type="number" value={fatPer100g} onChange={(e) => setFatPer100g(Number(e.target.value))} />
                  <Input label="Carbs (g)" type="number" value={carbsPer100g} onChange={(e) => setCarbsPer100g(Number(e.target.value))} />
                  <Input label="Fiber (g)" type="number" value={fiberPer100g} onChange={(e) => setFiberPer100g(Number(e.target.value))} />
                  <Input label="Sodium (mg)" type="number" value={sodiumPer100g} onChange={(e) => setSodiumPer100g(Number(e.target.value))} />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    checked={isPantryEssential}
                    onChange={(e) => setIsPantryEssential(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-muted-foreground">Pantry Essential</span>
                </div>
              </div>

              <div className="p-5 border-t border-border flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button onClick={handleManualAdd} loading={saving}>Add Ingredient</Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
