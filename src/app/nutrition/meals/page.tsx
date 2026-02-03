"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { getAuthToken } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Trash2, Plus, Utensils } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function MealsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const token = getAuthToken();

  const meals = useQuery(api.meals.list, token ? { token } : "skip");
  const ingredients = useQuery(api.ingredients.list, token ? { token } : "skip");
  const removeMeal = useMutation(api.meals.remove);
  const toggleFavorite = useMutation(api.meals.update);

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
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Meal Templates</h1>
              <p className="text-muted-foreground">{meals?.length ?? 0} meals saved</p>
            </div>
            <Button onClick={() => router.push("/nutrition/meals/new")}>
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
                  <Button className="mt-4" onClick={() => router.push("/nutrition/meals/new")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Meal
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
