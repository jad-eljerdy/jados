"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { getAuthToken } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Star, Trash2, Plus, ChefHat, Zap, Dumbbell, Loader2, Copy } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function MealsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const token = getAuthToken();

  const meals = useQuery(api.meals.list, token ? { token } : "skip");
  const ingredients = useQuery(api.ingredients.list, token ? { token } : "skip");
  const removeMeal = useMutation(api.meals.remove);
  const toggleFavorite = useMutation(api.meals.update);
  const duplicateMeal = useMutation(api.meals.duplicate);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleToggleFavorite = async (mealId: string, current: boolean) => {
    if (!token) return;
    await toggleFavorite({
      token,
      mealId: mealId as Id<"meals">,
      isFavorite: !current,
    });
  };

  const getIngredientName = (id: string) => {
    return ingredients?.find((i) => i._id === id)?.name ?? "Unknown";
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
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-xl font-semibold">Meals</h1>
              <p className="text-sm text-muted-foreground">{meals?.length ?? 0} templates saved</p>
            </div>
            <Button onClick={() => router.push("/nutrition/meals/new")}>
              <Plus className="h-4 w-4 mr-2" />
              New Meal
            </Button>
          </div>

          {/* Meals Grid */}
          {meals && meals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {meals.map((meal, idx) => (
                <div
                  key={meal._id}
                  className={cn(
                    "group relative p-5 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all duration-200 animate-fade-in",
                  )}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Favorite button */}
                  <button
                    onClick={() => handleToggleFavorite(meal._id, meal.isFavorite)}
                    className="absolute top-4 right-4 p-1.5 rounded-md transition-colors"
                  >
                    <Star
                      className={cn(
                        "h-4 w-4 transition-colors",
                        meal.isFavorite
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30 hover:text-amber-400"
                      )}
                    />
                  </button>

                  {/* Content */}
                  <h3 className="font-medium mb-3 pr-8">{meal.name}</h3>

                  {/* Macros */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-500/70" />
                      <span className="text-sm font-medium">{Math.round(meal.totalCalories)}</span>
                      <span className="text-xs text-muted-foreground">kcal</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Dumbbell className="h-3.5 w-3.5 text-violet-400/70" />
                      <span className="text-sm font-medium">{Math.round(meal.totalProtein)}g</span>
                      <span className="text-xs text-muted-foreground">protein</span>
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {meal.components.slice(0, 4).map((comp, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs font-normal">
                        {getIngredientName(comp.ingredientId)}
                      </Badge>
                    ))}
                    {meal.components.length > 4 && (
                      <Badge variant="outline" className="text-xs font-normal">
                        +{meal.components.length - 4}
                      </Badge>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/30">
                    <span className="text-xs text-muted-foreground">
                      {meal.components.length} ingredients
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => token && duplicateMeal({ token, mealId: meal._id })}
                        className="p-1.5 rounded text-muted-foreground/30 hover:text-foreground transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => token && removeMeal({ token, mealId: meal._id })}
                        className="p-1.5 rounded text-muted-foreground/30 hover:text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <ChefHat className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-medium mb-1">No meals yet</h3>
              <p className="text-sm text-muted-foreground mb-6">Create your first meal template</p>
              <Button onClick={() => router.push("/nutrition/meals/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Create Meal
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
