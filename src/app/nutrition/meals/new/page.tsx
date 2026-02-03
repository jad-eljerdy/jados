"use client";

import { useEffect, useState, useRef } from "react";
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
import { cn } from "@/lib/utils";
import { ArrowLeft, Plus, X, Send, Loader2, Sparkles, Trash2, Zap, Dumbbell, Droplet, Leaf } from "lucide-react";
import type { Id } from "../../../../../convex/_generated/dataModel";

const SLOTS = [
  { value: "protein_anchor", label: "Protein" },
  { value: "fat_source", label: "Fat Source" },
  { value: "micronutrient_veg", label: "Vegetable" },
  { value: "condiment", label: "Condiment" },
];

export default function NewMealPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const token = getAuthToken();
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Ingredient options
  const ingredientOptions =
    ingredients?.map((ing) => ({
      value: ing._id,
      label: ing.name,
      description: `${Math.round(ing.caloriesPer100g)} cal · ${Math.round(ing.proteinPer100g)}g P`,
    })) ?? [];

  // Calculate totals
  const totals = components.reduce(
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

  const targets = config && config.exists !== false
    ? { cal: config.caloricCeiling, p: config.proteinTarget, f: config.fatTarget, c: config.netCarbLimit }
    : { cal: 1650, p: 120, f: 120, c: 25 };

  // Assistant context
  const assistantContext = {
    view: "meal_creation" as const,
    mealName: mealName || undefined,
    components: components.filter((c) => c.ingredientId).map((c) => {
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
    totals,
    targets: { caloricCeiling: targets.cal, proteinTarget: targets.p, fatTarget: targets.f, netCarbLimit: targets.c },
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
    if (!token || !mealName.trim()) return;
    const valid = components.filter((c) => c.ingredientId);
    if (!valid.length) return;

    setSaving(true);
    try {
      await createMeal({
        token,
        name: mealName,
        components: valid.map((c) => ({
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

  const handleChat = async (msg?: string) => {
    const text = msg || chatInput.trim();
    if (!text || !token || chatLoading) return;
    setChatInput("");
    setChatLoading(true);
    try {
      await chat({ token, sessionId: assistantSessionId, message: text, context: assistantContext });
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const calPercent = Math.min(100, (totals.calories / targets.cal) * 100);
  const proteinPercent = Math.min(100, (totals.protein / targets.p) * 100);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      {/* Main - Meal Builder */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => router.push("/nutrition/meals")}
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">New Meal</h1>
              <p className="text-sm text-muted-foreground">Build your meal template</p>
            </div>
          </div>

          {/* Meal Name */}
          <div className="mb-8">
            <Input
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder="Meal name..."
              className="text-lg font-medium h-12 bg-transparent border-0 border-b border-border/50 rounded-none px-0 focus:ring-0 focus:border-primary/50"
            />
          </div>

          {/* Macro Progress */}
          {components.some((c) => c.ingredientId) && (
            <div className="mb-8 p-5 rounded-xl bg-card border border-border/50">
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs text-muted-foreground">Calories</span>
                  </div>
                  <div className="text-2xl font-semibold tracking-tight">{Math.round(totals.calories)}</div>
                  <div className="h-1 mt-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${calPercent}%` }} />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">of {targets.cal}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Dumbbell className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-xs text-muted-foreground">Protein</span>
                  </div>
                  <div className="text-2xl font-semibold tracking-tight">{Math.round(totals.protein)}<span className="text-sm font-normal text-muted-foreground">g</span></div>
                  <div className="h-1 mt-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-violet-400 transition-all duration-300" style={{ width: `${proteinPercent}%` }} />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">of {targets.p}g</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Droplet className="h-3.5 w-3.5 text-sky-400" />
                    <span className="text-xs text-muted-foreground">Fat</span>
                  </div>
                  <div className="text-2xl font-semibold tracking-tight">{Math.round(totals.fat)}<span className="text-sm font-normal text-muted-foreground">g</span></div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Leaf className="h-3.5 w-3.5 text-teal-400" />
                    <span className="text-xs text-muted-foreground">Carbs</span>
                  </div>
                  <div className="text-2xl font-semibold tracking-tight">{Math.round(totals.carbs)}<span className="text-sm font-normal text-muted-foreground">g</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Ingredients */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-muted-foreground">Ingredients</h2>
              <Button variant="ghost" size="sm" onClick={addComponent} className="h-7 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {components.map((comp, idx) => {
                const ing = ingredients?.find((i) => i._id === comp.ingredientId);
                return (
                  <div
                    key={idx}
                    className="group flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/30 hover:border-border/60 transition-colors"
                  >
                    <div className="flex-1 grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-5">
                        <Combobox
                          options={ingredientOptions}
                          value={comp.ingredientId}
                          onValueChange={(v) => updateComponent(idx, "ingredientId", v)}
                          placeholder="Select ingredient..."
                          searchPlaceholder="Search..."
                          emptyText="No ingredients"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={comp.weightGrams}
                          onChange={(e) => updateComponent(idx, "weightGrams", Number(e.target.value))}
                          className="h-9 text-center"
                        />
                      </div>
                      <div className="col-span-2 text-xs text-muted-foreground">
                        grams
                      </div>
                      <div className="col-span-2">
                        <Select value={comp.slot} onValueChange={(v) => updateComponent(idx, "slot", v)}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SLOTS.map((s) => (
                              <SelectItem key={s.value} value={s.value} className="text-xs">
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => removeComponent(idx)}
                          className="p-1.5 rounded text-muted-foreground/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {components.length === 0 && (
                <button
                  onClick={addComponent}
                  className="w-full p-8 rounded-lg border-2 border-dashed border-border/50 text-muted-foreground hover:border-border hover:text-foreground transition-colors"
                >
                  <Plus className="h-5 w-5 mx-auto mb-2" />
                  <span className="text-sm">Add your first ingredient</span>
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => router.push("/nutrition/meals")}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={saving} disabled={!mealName.trim() || !components.some((c) => c.ingredientId)}>
              Create Meal
            </Button>
          </div>
        </div>
      </main>

      {/* Right Panel - Assistant */}
      <aside className="w-80 border-l border-border/50 flex flex-col bg-card/30">
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-medium">Assistant</span>
          </div>
          <button
            onClick={() => token && clearSession({ token, sessionId: assistantSessionId })}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {(!messages || messages.length === 0) && (
            <div className="text-center py-12">
              <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Ask me anything</p>
              <p className="text-xs text-muted-foreground/60 mt-1">I can see what you're building</p>
            </div>
          )}

          {messages?.map((msg) => (
            <div
              key={msg._id}
              className={cn("flex animate-fade-in", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-foreground"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {chatLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-muted/50 rounded-xl px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {(!messages || messages.length < 2) && (
          <div className="px-4 py-2 border-t border-border/30">
            <div className="flex flex-wrap gap-1.5">
              {["Suggest protein", "Check macros", "What's missing?"].map((q) => (
                <button
                  key={q}
                  onClick={() => handleChat(q)}
                  disabled={chatLoading}
                  className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-border/50">
          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleChat()}
              placeholder="Ask anything..."
              className="flex-1 h-9 text-sm"
            />
            <Button size="icon" onClick={() => handleChat()} disabled={!chatInput.trim() || chatLoading} className="h-9 w-9">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
