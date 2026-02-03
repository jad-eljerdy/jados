"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAuthToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Zap,
  Dumbbell,
  Droplet,
  Leaf,
  Check,
  ChefHat,
  Calendar,
  TrendingUp,
  Loader2,
  ArrowRight,
  Flame,
} from "lucide-react";

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  const token = getAuthToken();

  // Get today's date
  const today = new Date().toISOString().split("T")[0];
  const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

  // Queries
  const config = useQuery(api.nutritionConfig.getConfig, token ? { token } : "skip");
  const todayPlan = useQuery(api.mealPlans.getDay, token ? { token, date: today } : "skip");
  const meals = useQuery(api.meals.list, token ? { token } : "skip");
  const weekPlans = useQuery(api.mealPlans.getWeek, token ? { token, weekStart: getWeekStart(new Date()) } : "skip");

  // Mutations
  const markConsumed = useMutation(api.mealPlans.markConsumed);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate week stats
  const weekStats = weekPlans?.reduce(
    (acc, day) => {
      if (day.plan) {
        acc.planned++;
        if (day.plan.status === "consumed") acc.consumed++;
        acc.totalCalories += day.plan.totalCalories;
        acc.totalProtein += day.plan.totalProtein;
      }
      return acc;
    },
    { planned: 0, consumed: 0, totalCalories: 0, totalProtein: 0 }
  ) ?? { planned: 0, consumed: 0, totalCalories: 0, totalProtein: 0 };

  const adherencePercent = weekStats.planned > 0 
    ? Math.round((weekStats.consumed / weekStats.planned) * 100) 
    : 0;

  const targets = config && config.exists !== false
    ? { cal: config.caloricCeiling, p: config.proteinTarget, f: config.fatTarget, c: config.netCarbLimit }
    : { cal: 1650, p: 120, f: 120, c: 25 };

  // todayPlan is the plan directly (not wrapped in .plan)
  const todayMacros = todayPlan
    ? {
        calories: todayPlan.totalCalories,
        protein: todayPlan.totalProtein,
        fat: todayPlan.totalFat,
        carbs: todayPlan.totalCarbs,
      }
    : null;

  const getMealName = (mealId: string) => {
    return meals?.find((m) => m._id === mealId)?.name ?? "Unknown meal";
  };

  const handleMarkConsumed = async () => {
    if (!token) return;
    await markConsumed({ token, date: today });
  };

  const isConsumed = todayPlan?.status === "consumed";

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold mb-1">
              Good {getGreeting()}, {user?.name?.split(" ")[0] ?? "there"}
            </h1>
            <p className="text-muted-foreground">
              {dayOfWeek}, {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}
            </p>
          </div>

          {/* Today's Meal */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Today</h2>
              {todayPlan && !isConsumed && (
                <Button size="sm" onClick={handleMarkConsumed}>
                  <Check className="h-4 w-4 mr-1.5" />
                  Mark Consumed
                </Button>
              )}
            </div>

            {todayPlan ? (
              <Card className={cn("transition-all", isConsumed && "opacity-60")}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <ChefHat className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {todayPlan.slots[0]?.mealId 
                            ? getMealName(todayPlan.slots[0].mealId)
                            : "Custom meal"}
                        </span>
                      </div>
                      {isConsumed && (
                        <Badge variant="success" className="mt-1">
                          <Check className="h-3 w-3 mr-1" />
                          Consumed
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Macro Grid */}
                  <div className="grid grid-cols-4 gap-4">
                    <MacroCard
                      icon={Zap}
                      label="Calories"
                      value={Math.round(todayMacros!.calories)}
                      target={targets.cal}
                      color="amber"
                    />
                    <MacroCard
                      icon={Dumbbell}
                      label="Protein"
                      value={Math.round(todayMacros!.protein)}
                      target={targets.p}
                      unit="g"
                      color="violet"
                    />
                    <MacroCard
                      icon={Droplet}
                      label="Fat"
                      value={Math.round(todayMacros!.fat)}
                      target={targets.f}
                      unit="g"
                      color="sky"
                    />
                    <MacroCard
                      icon={Leaf}
                      label="Carbs"
                      value={Math.round(todayMacros!.carbs)}
                      target={targets.c}
                      unit="g"
                      color="teal"
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-4">
                    <ChefHat className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground mb-4">No meal planned for today</p>
                    <Button variant="outline" onClick={() => router.push("/nutrition/planner")}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Plan your meal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Week Overview */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">This Week</span>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold">{adherencePercent}%</span>
                  <span className="text-sm text-muted-foreground">adherence</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {weekStats.consumed} of {weekStats.planned} meals consumed
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Avg Daily</span>
                  <Flame className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold">
                    {weekStats.consumed > 0 
                      ? Math.round(weekStats.totalCalories / weekStats.consumed) 
                      : "—"}
                  </span>
                  <span className="text-sm text-muted-foreground">kcal</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {weekStats.consumed > 0 
                    ? `${Math.round(weekStats.totalProtein / weekStats.consumed)}g protein avg`
                    : "No data yet"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-3">
              <QuickAction
                label="Plan meals"
                icon={Calendar}
                onClick={() => router.push("/nutrition/planner")}
              />
              <QuickAction
                label="Create meal"
                icon={ChefHat}
                onClick={() => router.push("/nutrition/meals/new")}
              />
              <QuickAction
                label="Shopping list"
                icon={ArrowRight}
                onClick={() => router.push("/nutrition/shopping")}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MacroCard({
  icon: Icon,
  label,
  value,
  target,
  unit,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  target: number;
  unit?: string;
  color: "amber" | "violet" | "sky" | "teal";
}) {
  const percent = Math.min(100, (value / target) * 100);
  const colorClasses = {
    amber: "text-amber-500 bg-amber-500",
    violet: "text-violet-400 bg-violet-400",
    sky: "text-sky-400 bg-sky-400",
    teal: "text-teal-400 bg-teal-400",
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={cn("h-3.5 w-3.5", colorClasses[color].split(" ")[0])} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-xl font-semibold">
        {value}
        {unit && <span className="text-sm font-normal text-muted-foreground">{unit}</span>}
      </div>
      <div className="h-1 mt-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={cn("h-full transition-all", colorClasses[color].split(" ")[1])}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">of {target}{unit}</div>
    </div>
  );
}

function QuickAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: any;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all text-left"
    >
      <Icon className="h-5 w-5 text-muted-foreground" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}
