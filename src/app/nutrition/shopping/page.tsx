"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { getAuthToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  RefreshCw,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
  Share2,
} from "lucide-react";

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}

export default function ShoppingListPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const token = getAuthToken();

  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));
  const [excludePantry, setExcludePantry] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const weekEnd = getWeekEnd(currentWeekStart);

  // Get the raw shopping list (with IDs for toggling)
  const rawList = useQuery(api.shoppingList.get, token ? { token, weekStart: currentWeekStart } : "skip");
  const formattedList = useQuery(
    api.shoppingList.getFormatted,
    token ? { token, weekStart: currentWeekStart, excludePantry } : "skip"
  );
  const generateList = useMutation(api.shoppingList.generate);
  const toggleItem = useMutation(api.shoppingList.toggleItem);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleGenerate = async () => {
    if (!token) return;
    setGenerating(true);
    try {
      await generateList({ token, weekStart: currentWeekStart, weekEnd });
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleToggle = async (ingredientName: string, checked: boolean) => {
    if (!token || !rawList) return;
    // Find the item by name to get its ingredientId
    const item = rawList.items.find((i) => i.ingredientName === ingredientName);
    if (!item) return;
    await toggleItem({
      token,
      listId: rawList._id,
      ingredientId: item.ingredientId,
      checked,
    });
  };

  const navigateWeek = (direction: number) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + direction * 7);
    setCurrentWeekStart(d.toISOString().split("T")[0]);
  };

  const copyToClipboard = () => {
    if (!formattedList) return;

    let text = `🛒 Shopping List\n${formattedList.weekStart} → ${formattedList.weekEnd}\n\n`;
    Object.entries(formattedList.categories).forEach(([category, items]) => {
      text += `${category.toUpperCase()}\n`;
      (items as any[]).forEach((item) => {
        text += `${item.checked ? "✓" : "○"} ${item.name} — ${item.weight}\n`;
      });
      text += "\n";
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const checkedCount = formattedList?.checkedItems ?? 0;
  const totalCount = formattedList?.totalItems ?? 0;
  const progressPercent = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold">Shopping List</h1>
              <p className="text-sm text-muted-foreground">
                {new Date(currentWeekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {" → "}
                {new Date(weekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrentWeekStart(getWeekStart(new Date()))}>
                <Calendar className="h-4 w-4 mr-1.5" />
                Today
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-between mb-6 p-3 rounded-lg bg-card border border-border/50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={excludePantry}
                onChange={(e) => setExcludePantry(e.target.checked)}
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-sm text-muted-foreground">Hide pantry items</span>
            </label>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={copyToClipboard} disabled={!formattedList}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button size="sm" onClick={handleGenerate} loading={generating}>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Generate
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          {formattedList && totalCount > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">{checkedCount} of {totalCount} items</span>
                <span className="font-medium">{Math.round(progressPercent)}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Shopping List */}
          {formattedList && Object.keys(formattedList.categories).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(formattedList.categories).map(([category, items]) => (
                <div key={category} className="rounded-xl border border-border/50 overflow-hidden">
                  <div className="px-4 py-2.5 bg-card/50 border-b border-border/30">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {category}
                    </h3>
                  </div>
                  <div className="divide-y divide-border/30">
                    {(items as any[]).map((item, idx) => (
                      <label
                        key={idx}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-card/50",
                          item.checked && "bg-card/30"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => handleToggle(item.name, e.target.checked)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span
                          className={cn(
                            "flex-1 text-sm transition-all",
                            item.checked && "text-muted-foreground line-through"
                          )}
                        >
                          {item.name}
                        </span>
                        <span className="text-sm text-muted-foreground font-mono">
                          {item.weight}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : formattedList ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground mb-1">No items this week</p>
              <p className="text-sm text-muted-foreground/70">Plan some meals first</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground mb-4">No shopping list yet</p>
              <Button onClick={handleGenerate} loading={generating}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate from Meal Plan
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
