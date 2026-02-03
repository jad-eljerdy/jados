"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAuthToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  Check,
  AlertTriangle,
  TrendingUp,
  Flame,
  Dumbbell,
  Loader2,
  X,
} from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
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

  // Calculate week stats
  const weekStats = useMemo(() => {
    if (!weekPlans) return null;
    
    let planned = 0;
    let consumed = 0;
    let totalCalories = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;
    let warningCount = 0;

    for (const day of weekPlans) {
      if (day.plan) {
        planned++;
        if (day.plan.status === "consumed") {
          consumed++;
          totalCalories += day.plan.totalCalories;
          totalProtein += day.plan.totalProtein;
          totalFat += day.plan.totalFat;
          totalCarbs += day.plan.totalCarbs;
        }
        warningCount += day.plan.warnings?.length ?? 0;
      }
    }

    return {
      planned,
      consumed,
      adherencePercent: planned > 0 ? Math.round((consumed / planned) * 100) : 0,
      avgCalories: consumed > 0 ? Math.round(totalCalories / consumed) : 0,
      avgProtein: consumed > 0 ? Math.round(totalProtein / consumed) : 0,
      avgFat: consumed > 0 ? Math.round(totalFat / consumed) : 0,
      avgCarbs: consumed > 0 ? Math.round(totalCarbs / consumed) : 0,
      warningCount,
    };
  }, [weekPlans]);

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

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const targets = config && config.exists !== false
    ? { cal: config.caloricCeiling, p: config.proteinTarget }
    : { cal: 1650, p: 120 };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-semibold">Meal Planner</h1>
              <p className="text-sm text-muted-foreground">
                {targets.cal} kcal · {targets.p}g protein target
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrentWeekStart(getWeekStart(new Date()))}>
                <Calendar className="h-4 w-4 mr-1.5" />
                {formatDate(currentWeekStart)} - {formatDate(
                  new Date(new Date(currentWeekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Week Summary */}
          {weekStats && weekStats.consumed > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Adherence</span>
                  </div>
                  <div className="text-2xl font-semibold">{weekStats.adherencePercent}%</div>
                  <div className="text-xs text-muted-foreground">{weekStats.consumed}/{weekStats.planned} days</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="h-4 w-4 text-amber-500" />
                    <span className="text-xs text-muted-foreground">Avg Calories</span>
                  </div>
                  <div className="text-2xl font-semibold">{weekStats.avgCalories}</div>
                  <div className="text-xs text-muted-foreground">kcal/day</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Dumbbell className="h-4 w-4 text-violet-400" />
                    <span className="text-xs text-muted-foreground">Avg Protein</span>
                  </div>
                  <div className="text-2xl font-semibold">{weekStats.avgProtein}g</div>
                  <div className="text-xs text-muted-foreground">of {targets.p}g target</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-xs text-muted-foreground">Warnings</span>
                  </div>
                  <div className="text-2xl font-semibold">{weekStats.warningCount}</div>
                  <div className="text-xs text-muted-foreground">this week</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Week Grid - Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {weekPlans?.map((day) => {
              const isToday = day.date === today;
              const isPast = day.date < today;
              const hasWarnings = day.plan?.warnings && day.plan.warnings.length > 0;
              const isConsumed = day.plan?.status === "consumed";

              return (
                <Card
                  key={day.date}
                  className={cn(
                    "relative overflow-hidden transition-all",
                    isToday && "ring-2 ring-primary",
                    isConsumed && "opacity-70"
                  )}
                >
                  <CardContent className="p-4 min-h-[160px]">
                    {/* Day Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground block lg:hidden">
                          {DAYS_FULL[day.dayOfWeek]}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground hidden lg:block">
                          {DAYS[day.dayOfWeek]}
                        </span>
                        <span className={cn(
                          "text-sm font-medium",
                          isToday && "text-primary"
                        )}>
                          {formatDate(day.date)}
                        </span>
                      </div>
                      {isToday && (
                        <Badge variant="default" className="text-[10px] px-1.5">Today</Badge>
                      )}
                      {isConsumed && (
                        <Badge variant="success" className="text-[10px] px-1.5">
                          <Check className="h-2.5 w-2.5 mr-0.5" />
                          Done
                        </Badge>
                      )}
                    </div>

                    {day.plan ? (
                      <div className="space-y-2">
                        {/* Macros */}
                        <div className="text-lg font-semibold">
                          {Math.round(day.plan.totalCalories)}
                          <span className="text-xs font-normal text-muted-foreground ml-1">kcal</span>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span className="text-violet-400">{Math.round(day.plan.totalProtein)}g P</span>
                          <span className="text-sky-400">{Math.round(day.plan.totalFat)}g F</span>
                          <span className="text-teal-400">{Math.round(day.plan.totalCarbs)}g C</span>
                        </div>

                        {/* Warnings */}
                        {hasWarnings && (
                          <div className="text-[10px] text-amber-500 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {day.plan.warnings.length} warning{day.plan.warnings.length > 1 ? "s" : ""}
                          </div>
                        )}

                        {/* Actions */}
                        {isToday && !isConsumed && (
                          <Button
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => handleMarkConsumed(day.date)}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Mark Done
                          </Button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedDay(day.date);
                          setShowMealPicker(true);
                        }}
                        className={cn(
                          "w-full h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 transition-colors",
                          isPast
                            ? "border-border/30 text-muted-foreground/30"
                            : "border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary"
                        )}
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-xs">Add meal</span>
                      </button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* No meals warning */}
          {meals?.length === 0 && (
            <Card className="mt-6 border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-500">No meal templates yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create meal templates first, then come back to plan your week.
                    </p>
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => router.push("/nutrition/meals/new")}
                    >
                      Create Meal
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Meal Picker Modal */}
        {showMealPicker && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-xl w-full max-w-md max-h-[70vh] overflow-hidden border border-border">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div>
                  <h2 className="font-semibold">Select Meal</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedDay && DAYS_FULL[new Date(selectedDay).getDay()]}, {selectedDay && formatDate(selectedDay)}
                  </p>
                </div>
                <button
                  onClick={() => setShowMealPicker(false)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[400px]">
                {meals?.map((meal) => (
                  <button
                    key={meal._id}
                    onClick={() => handleSelectMeal(meal._id)}
                    className="w-full p-4 text-left border-b border-border/50 hover:bg-card/80 transition-colors"
                  >
                    <div className="font-medium">{meal.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {Math.round(meal.totalCalories)} kcal · 
                      <span className="text-violet-400"> {Math.round(meal.totalProtein)}g P</span> · 
                      <span className="text-sky-400"> {Math.round(meal.totalFat)}g F</span> · 
                      <span className="text-teal-400"> {Math.round(meal.totalCarbs)}g C</span>
                    </div>
                  </button>
                ))}
                {(!meals || meals.length === 0) && (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground mb-3">No meals available</p>
                    <Button onClick={() => router.push("/nutrition/meals/new")}>
                      Create First Meal
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
