"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { getAuthToken } from "@/lib/auth";

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

  const weekEnd = getWeekEnd(currentWeekStart);
  
  const shoppingList = useQuery(
    api.shoppingList.getFormatted,
    token ? { token, weekStart: currentWeekStart, excludePantry } : "skip"
  );
  const generateList = useMutation(api.shoppingList.generate);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleGenerate = async () => {
    if (!token) return;
    setGenerating(true);
    try {
      await generateList({
        token,
        weekStart: currentWeekStart,
        weekEnd,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const navigateWeek = (direction: number) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + direction * 7);
    setCurrentWeekStart(d.toISOString().split("T")[0]);
  };

  const copyToClipboard = () => {
    if (!shoppingList) return;
    
    let text = `Shopping List: ${shoppingList.weekStart} to ${shoppingList.weekEnd}\n\n`;
    Object.entries(shoppingList.categories).forEach(([category, items]) => {
      text += `${category.toUpperCase()}\n`;
      items.forEach((item) => {
        text += `  ${item.checked ? "☑" : "☐"} ${item.name} - ${item.weight}\n`;
      });
      text += "\n";
    });

    navigator.clipboard.writeText(text);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Shopping List</h1>
              <p className="text-zinc-400">
                Week of {new Date(currentWeekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {" → "}
                {new Date(weekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigateWeek(-1)}>←</Button>
              <Button variant="ghost" onClick={() => setCurrentWeekStart(getWeekStart(new Date()))}>
                This Week
              </Button>
              <Button variant="ghost" onClick={() => navigateWeek(1)}>→</Button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={excludePantry}
                onChange={(e) => setExcludePantry(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-800 border-zinc-700"
              />
              <span className="text-sm text-zinc-400">Hide pantry essentials</span>
            </label>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={copyToClipboard} disabled={!shoppingList}>
                📋 Copy
              </Button>
              <Button onClick={handleGenerate} loading={generating}>
                🔄 Generate from Plan
              </Button>
            </div>
          </div>

          {/* Shopping List */}
          {shoppingList ? (
            <div className="space-y-6">
              {Object.entries(shoppingList.categories).map(([category, items]) => (
                <div key={category} className="bg-zinc-900 rounded-xl p-5">
                  <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0 ${
                          item.checked ? "opacity-50" : ""
                        }`}
                      >
                        <span className={`text-white ${item.checked ? "line-through" : ""}`}>
                          {item.name}
                        </span>
                        <span className="text-zinc-400 font-mono">{item.weight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="text-center text-sm text-zinc-500">
                {shoppingList.totalItems} items total
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 rounded-xl p-8 text-center">
              <p className="text-zinc-400 mb-4">
                No shopping list for this week yet.
              </p>
              <p className="text-sm text-zinc-500 mb-4">
                Plan your meals first, then generate the shopping list.
              </p>
              <Button onClick={handleGenerate} loading={generating}>
                Generate Shopping List
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
