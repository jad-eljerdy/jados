"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthToken } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, X, Send, Loader2, Bot, Trash2 } from "lucide-react";
import type { Id } from "../../../../../convex/_generated/dataModel";

const SLOTS = [
  { value: "protein_anchor", label: "Protein Anchor" },
  { value: "fat_source", label: "Fat Source" },
  { value: "micronutrient_veg", label: "Vegetable" },
  { value: "condiment", label: "Condiment/Sauce" },
];

export default function NewMealPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const token = getAuthToken();

  const ingredients = useQuery(api.ingredients.list, token ? { token } : "skip");
  const config = useQuery(api.nutritionConfig.getConfig, token ? { token } : "skip");
  const createMeal = useMutation(api.meals.create);

  // Assistant
  const [assistantSessionId] = useState(() => `meal_creation_${Date.now()}`);
  const messages = useQuery(
    api.assistant.getMessages,
    token ? { token, sessionId: assistantSessionId } : "skip"
  );
  const chat = useAction(api.assistant.chat);
  const clearSession = useMutation(api.assistant.clearSession);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Form state
  const [mealName, setMealName] = useState("");
  const [components, setComponents] = useState<
    Array<{ slot: string; ingredientId: string; weightGrams: number }>
  >([{ slot: "protein_anchor", ingredientId: "", weightGrams: 150 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Ingredient options for combobox
  const ingredientOptions =
    ingredients?.map((ing) => ({
      value: ing._id,
      label: ing.name,
      description: `${Math.round(ing.caloriesPer100g)} cal • ${Math.round(ing.proteinPer100g)}g P • ${ing.category}`,
    })) ?? [];

  // Calculate totals
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

  // Assistant context
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
      router.push("/nutrition/meals");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !token || chatLoading) return;
    const msg = chatInput;
    setChatInput("");
    setChatLoading(true);
    try {
      await chat({
        token,
        sessionId: assistantSessionId,
        message: msg,
        context: assistantContext,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      {/* Main Content - Meal Builder */}
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => router.push("/nutrition/meals")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Create Meal</h1>
              <p className="text-muted-foreground">Build a new meal template</p>
            </div>
          </div>

          {/* Meal Name */}
          <div className="mb-6">
            <Input
              label="Meal Name"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder="e.g., Keto Chicken Dinner"
            />
          </div>

          {/* Ingredients */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold">Ingredients</Label>
              <Button variant="outline" size="sm" onClick={addComponent}>
                <Plus className="h-4 w-4 mr-1" />
                Add Ingredient
              </Button>
            </div>

            <div className="space-y-3">
              {components.map((comp, idx) => (
                <Card key={idx} className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex gap-3 items-start">
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
                            emptyText="No ingredients found."
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
                  </CardContent>
                </Card>
              ))}

              {components.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                  Add ingredients to build your meal
                </div>
              )}
            </div>
          </div>

          {/* Nutrition Preview */}
          {components.some((c) => c.ingredientId) && (
            <Card className="bg-primary/5 border-primary/20 mb-6">
              <CardContent className="py-4">
                <div className="text-sm text-muted-foreground mb-2">Nutrition Preview</div>
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-3xl font-bold text-primary">
                      {Math.round(previewTotals.calories)}
                    </div>
                    <div className="text-xs text-muted-foreground">kcal</div>
                  </div>
                  <div className="h-10 w-px bg-border" />
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-2xl text-blue-400 font-semibold">
                        {Math.round(previewTotals.protein)}
                      </span>
                      <span className="text-muted-foreground ml-1">g P</span>
                    </div>
                    <div>
                      <span className="text-2xl text-yellow-400 font-semibold">
                        {Math.round(previewTotals.fat)}
                      </span>
                      <span className="text-muted-foreground ml-1">g F</span>
                    </div>
                    <div>
                      <span className="text-2xl text-green-400 font-semibold">
                        {Math.round(previewTotals.carbs)}
                      </span>
                      <span className="text-muted-foreground ml-1">g C</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => router.push("/nutrition/meals")}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={saving}
              disabled={!mealName.trim() || !components.some((c) => c.ingredientId)}
            >
              Create Meal
            </Button>
          </div>
        </div>
      </main>

      {/* Right Panel - Assistant */}
      <aside className="w-96 border-l border-border flex flex-col bg-card">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Son of Anton</h3>
              <p className="text-xs text-muted-foreground">Nutrition Assistant</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => token && clearSession({ token, sessionId: assistantSessionId })}
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {(!messages || messages.length === 0) && (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Ask me anything about your meal!</p>
              <p className="text-xs mt-1">I can see what you're building.</p>
            </div>
          )}
          
          {messages?.map((msg) => (
            <div
              key={msg._id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-lg px-3 py-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {(!messages || messages.length < 2) && (
          <div className="px-4 py-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
            <div className="flex flex-wrap gap-1">
              {["Suggest protein", "Check macros", "Add vegetables", "Is this balanced?"].map(
                (q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setChatInput(q);
                      setTimeout(() => handleSendChat(), 0);
                    }}
                    disabled={chatLoading}
                    className="text-xs px-2 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
                  >
                    {q}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
              placeholder="Ask me anything..."
              className="flex-1"
            />
            <Button size="icon" onClick={handleSendChat} disabled={!chatInput.trim() || chatLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
