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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Star, Trash2, Plus, X, Utensils, Sparkles } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AssistantSidebar } from "@/components/assistant/AssistantSidebar";

const SLOTS = [
  { value: "protein_anchor", label: "Protein Anchor" },
  { value: "fat_source", label: "Fat Source" },
  { value: "micronutrient_veg", label: "Vegetable" },
  { value: "condiment", label: "Condiment/Sauce" },
];

export default function MealsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const token = getAuthToken();

  const meals = useQuery(api.meals.list, token ? { token } : "skip");
  const ingredients = useQuery(api.ingredients.list, token ? { token } : "skip");
  const config = useQuery(api.nutritionConfig.getConfig, token ? { token } : "skip");
  const createMeal = useMutation(api.meals.create);
  const removeMeal = useMutation(api.meals.remove);
  const toggleFavorite = useMutation(api.meals.update);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mealName, setMealName] = useState("");
  const [components, setComponents] = useState<
    Array<{ slot: string; ingredientId: string; weightGrams: number }>
  >([]);
  const [saving, setSaving] = useState(false);
  
  // Assistant state
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantSessionId] = useState(() => `meal_creation_${Date.now()}`);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Create ingredient options for combobox
  const ingredientOptions =
    ingredients?.map((ing) => ({
      value: ing._id,
      label: ing.name,
      description: `${Math.round(ing.caloriesPer100g)} cal • ${Math.round(ing.proteinPer100g)}g P • ${ing.category}`,
    })) ?? [];

  const addComponent = () => {
    setComponents([
      ...components,
      { slot: "protein_anchor", ingredientId: "", weightGrams: 100 },
    ]);
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

  const openCreateModal = () => {
    setMealName("");
    setComponents([{ slot: "protein_anchor", ingredientId: "", weightGrams: 150 }]);
    setShowCreateModal(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
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

  const getIngredientName = (id: string) => {
    return ingredients?.find((i) => i._id === id)?.name ?? "Unknown";
  };

  // Build assistant context
  const assistantContext = {
    view: "meal_creation" as const,
    mealName: mealName || undefined,
    components: components
      .filter((c) => c.ingredientId)
      .map((c) => {
        const ing = ingredients?.find((i) => i._id === c.ingredientId);
        const mult = c.weightGrams / 100;
        return {
          ingredientName: ing?.name ?? "Unknown",
          weightGrams: c.weightGrams,
          slot: c.slot,
          calories: (ing?.caloriesPer100g ?? 0) * mult,
          protein: (ing?.proteinPer100g ?? 0) * mult,
          fat: (ing?.fatPer100g ?? 0) * mult,
          carbs: (ing?.carbsPer100g ?? 0) * mult,
        };
      }),
    totals: previewTotals,
    targets: config && config.exists !== false
      ? {
          caloricCeiling: config.caloricCeiling,
          proteinTarget: config.proteinTarget,
          fatTarget: config.fatTarget,
          netCarbLimit: config.netCarbLimit,
        }
      : undefined,
    availableIngredients: ingredients?.map((ing) => ({
      name: ing.name,
      category: ing.category,
      caloriesPer100g: ing.caloriesPer100g,
      proteinPer100g: ing.proteinPer100g,
      fatPer100g: ing.fatPer100g,
      carbsPer100g: ing.carbsPer100g,
    })),
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Meal Templates</h1>
              <p className="text-muted-foreground">{meals?.length ?? 0} meals saved</p>
            </div>
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              Create Meal
            </Button>
          </div>

          {/* Meals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meals?.map((meal) => (
              <Card key={meal._id} className="relative group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{meal.name}</CardTitle>
                    <button
                      onClick={() => handleToggleFavorite(meal._id, meal.isFavorite)}
                      className="transition-colors"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          meal.isFavorite
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground hover:text-yellow-400"
                        }`}
                      />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-primary mb-2">
                    {Math.round(meal.totalCalories)} kcal
                  </div>
                  <div className="flex gap-3 text-sm mb-4">
                    <span className="text-blue-400">{Math.round(meal.totalProtein)}g P</span>
                    <span className="text-yellow-400">{Math.round(meal.totalFat)}g F</span>
                    <span className="text-green-400">{Math.round(meal.totalCarbs)}g C</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {meal.components.slice(0, 3).map((comp, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {getIngredientName(comp.ingredientId)}
                      </Badge>
                    ))}
                    {meal.components.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{meal.components.length - 3} more
                      </Badge>
                    )}
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {meal.components.length} ingredients
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => token && removeMeal({ token, mealId: meal._id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {(!meals || meals.length === 0) && (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Utensils className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    No meals yet. Create your first meal template!
                  </p>
                  <Button className="mt-4" onClick={openCreateModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Meal
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Create Meal Dialog */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Create Meal Template</DialogTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAssistantOpen(true)}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Ask Assistant
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <Input
                label="Meal Name"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                placeholder="e.g., Keto Chicken Dinner"
              />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base">Ingredients</Label>
                  <Button variant="outline" size="sm" onClick={addComponent}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Ingredient
                  </Button>
                </div>

                <div className="space-y-3">
                  {components.map((comp, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3 items-start p-3 rounded-lg bg-secondary/30 border border-border"
                    >
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">
                              Slot Type
                            </Label>
                            <Select
                              value={comp.slot}
                              onValueChange={(value) => updateComponent(idx, "slot", value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SLOTS.map((slot) => (
                                  <SelectItem key={slot.value} value={slot.value}>
                                    {slot.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">
                              Weight (g)
                            </Label>
                            <Input
                              type="number"
                              value={comp.weightGrams}
                              onChange={(e) =>
                                updateComponent(idx, "weightGrams", Number(e.target.value))
                              }
                              className="h-10"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            Ingredient
                          </Label>
                          <Combobox
                            options={ingredientOptions}
                            value={comp.ingredientId}
                            onValueChange={(value) => updateComponent(idx, "ingredientId", value)}
                            placeholder="Search ingredients..."
                            searchPlaceholder="Type to search..."
                            emptyText="No ingredients found. Add some first!"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive shrink-0 mt-6"
                        onClick={() => removeComponent(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {components.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                      Add ingredients to build your meal
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              {components.some((c) => c.ingredientId) && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="py-4">
                    <div className="text-sm text-muted-foreground mb-2">Nutrition Preview</div>
                    <div className="flex items-center gap-6">
                      <div>
                        <div className="text-2xl font-bold text-primary">
                          {Math.round(previewTotals.calories)}
                        </div>
                        <div className="text-xs text-muted-foreground">kcal</div>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-blue-400 font-semibold">
                            {Math.round(previewTotals.protein)}g
                          </span>
                          <span className="text-muted-foreground ml-1">P</span>
                        </div>
                        <div>
                          <span className="text-yellow-400 font-semibold">
                            {Math.round(previewTotals.fat)}g
                          </span>
                          <span className="text-muted-foreground ml-1">F</span>
                        </div>
                        <div>
                          <span className="text-green-400 font-semibold">
                            {Math.round(previewTotals.carbs)}g
                          </span>
                          <span className="text-muted-foreground ml-1">C</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                loading={saving}
                disabled={!mealName.trim() || !components.some((c) => c.ingredientId)}
              >
                Create Meal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assistant Sidebar */}
        <AssistantSidebar
          isOpen={assistantOpen}
          onClose={() => setAssistantOpen(false)}
          sessionId={assistantSessionId}
          context={assistantContext}
        />
      </main>
    </div>
  );
}
