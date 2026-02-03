"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { getAuthToken } from "@/lib/auth";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PlannerPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const token = getAuthToken();

  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));

  const weekPlans = useQuery(api.mealPlans.getWeek, token ? { token, weekStart: currentWeekStart } : "skip");
  const config = useQuery(api.nutritionConfig.getConfig, token ? { token } : "skip");
  const meals = useQuery(api.meals.list, token ? { token } : "skip");
  const setDayMeal = useMutation(api.mealPlans.setDayMeal);
  const markConsumed = useMutation(api.mealPlans.markConsumed);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showMealPicker, setShowMealPicker] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSelectMeal = async (mealId: string) => {
    if (!token || !selectedDay) return;
    try {
      await setDayMeal({
        token,
        date: selectedDay,
        slotIndex: 0,
        mealId: mealId as any,
      });
      setShowMealPicker(false);
      setSelectedDay(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkConsumed = async (date: string) => {
    if (!token) return;
    try {
      await markConsumed({ token, date });
    } catch (err) {
      console.error(err);
    }
  };

  const navigateWeek = (direction: number) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + direction * 7);
    setCurrentWeekStart(d.toISOString().split("T")[0]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto pt-14 md:pt-0 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Meal Planner</h1>
              <p className="text-muted-foreground">
                Week of {formatDate(currentWeekStart)} •{" "}
                {config?.caloricCeiling ?? 1650} kcal / {config?.proteinTarget ?? 120}g P target
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigateWeek(-1)}>
                ← Prev Week
              </Button>
              <Button variant="ghost" onClick={() => setCurrentWeekStart(getWeekStart(new Date()))}>
                Today
              </Button>
              <Button variant="ghost" onClick={() => navigateWeek(1)}>
                Next Week →
              </Button>
            </div>
          </div>

          {/* Week Grid */}
          <div className="grid grid-cols-7 gap-3">
            {weekPlans?.map((day) => {
              const isToday = day.date === today;
              const hasWarnings = day.plan?.warnings && day.plan.warnings.length > 0;
              const isConsumed = day.plan?.status === "consumed";

              return (
                <div
                  key={day.date}
                  className={`bg-card rounded-xl p-4 min-h-[200px] ${
                    isToday ? "ring-2 ring-green-500" : ""
                  } ${isConsumed ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      {DAYS[day.dayOfWeek]}
                    </span>
                    <span className={`text-sm ${isToday ? "text-green-400" : "text-zinc-500"}`}>
                      {formatDate(day.date)}
                    </span>
                  </div>

                  {day.plan ? (
                    <div>
                      {/* Macro summary */}
                      <div className="text-xs text-zinc-500 mb-2">
                        {Math.round(day.plan.totalCalories)} kcal
                      </div>
                      <div className="flex gap-1 text-xs mb-3">
                        <span className="text-blue-400">{Math.round(day.plan.totalProtein)}P</span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-yellow-400">{Math.round(day.plan.totalFat)}F</span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-green-400">{Math.round(day.plan.totalCarbs)}C</span>
                      </div>

                      {/* Warnings */}
                      {hasWarnings && (
                        <div className="text-xs text-amber-400 mb-2">
                          ⚠️ {day.plan.warnings.length} warning(s)
                        </div>
                      )}

                      {/* Status */}
                      {isConsumed ? (
                        <div className="text-xs text-green-400">✓ Consumed</div>
                      ) : isToday && day.plan.status === "planned" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleMarkConsumed(day.date)}
                          className="w-full mt-2"
                        >
                          Mark Consumed
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedDay(day.date);
                        setShowMealPicker(true);
                      }}
                      className="w-full h-24 border-2 border-dashed border-zinc-700 rounded-lg flex items-center justify-center text-zinc-500 hover:border-zinc-600 hover:text-muted-foreground transition-colors"
                    >
                      + Add Meal
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* No meals warning */}
          {meals?.length === 0 && (
            <div className="mt-8 bg-amber-900/20 border border-amber-700 rounded-lg p-4 text-amber-400">
              <p className="font-medium">No meals created yet</p>
              <p className="text-sm mt-1">
                Go to <a href="/nutrition/meals" className="underline">Meals</a> to create meal templates,
                or add <a href="/nutrition/ingredients" className="underline">Ingredients</a> first.
              </p>
            </div>
          )}
        </div>

        {/* Meal Picker Modal */}
        {showMealPicker && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-xl w-full max-w-md max-h-[70vh] overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">
                  Select Meal for {selectedDay && formatDate(selectedDay)}
                </h2>
              </div>

              <div className="overflow-y-auto max-h-[400px]">
                {meals?.map((meal) => (
                  <button
                    key={meal._id}
                    onClick={() => handleSelectMeal(meal._id)}
                    className="w-full p-4 text-left border-b border-border/50 hover:bg-zinc-800/50"
                  >
                    <div className="text-foreground font-medium">{meal.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {Math.round(meal.totalCalories)} kcal • {Math.round(meal.totalProtein)}g P •{" "}
                      {Math.round(meal.totalFat)}g F • {Math.round(meal.totalCarbs)}g C
                    </div>
                  </button>
                ))}
                {(!meals || meals.length === 0) && (
                  <div className="p-8 text-center text-zinc-500">
                    No meals available. Create some first.
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-border">
                <Button variant="ghost" onClick={() => setShowMealPicker(false)} className="w-full">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
