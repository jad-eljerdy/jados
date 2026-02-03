"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Home,
  User,
  Settings,
  Utensils,
  ChevronRight,
  LogOut,
  Dumbbell,
  Wallet,
  Dna,
  ShoppingCart,
  Calendar,
  ChefHat,
  Apple,
} from "lucide-react";

const mainNavigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Settings", href: "/settings", icon: Settings },
];

const nutritionNavigation = [
  { name: "Planner", href: "/nutrition/planner", icon: Calendar },
  { name: "Meals", href: "/nutrition/meals", icon: ChefHat },
  { name: "Ingredients", href: "/nutrition/ingredients", icon: Apple },
  { name: "Shopping", href: "/nutrition/shopping", icon: ShoppingCart },
  { name: "Settings", href: "/nutrition/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [nutritionExpanded, setNutritionExpanded] = useState(pathname.startsWith("/nutrition"));

  const isNutritionActive = pathname.startsWith("/nutrition");

  return (
    <div className="flex h-full w-60 flex-col border-r border-border/50 bg-card/50">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">J</span>
          </div>
          <span className="text-base font-semibold tracking-tight">JadOS</span>
          <span className="text-[10px] text-muted-foreground/70 font-medium px-1.5 py-0.5 rounded-md bg-secondary">
            beta
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto scrollbar-thin">
        {/* Main navigation */}
        {mainNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="h-px bg-border/50 my-3" />

        {/* Modules */}
        <div className="px-3 py-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Modules
          </span>
        </div>

        {/* Nutrition Module */}
        <div>
          <button
            onClick={() => setNutritionExpanded(!nutritionExpanded)}
            className={cn(
              "w-full flex items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
              isNutritionActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-2.5">
              <Utensils className="h-4 w-4" />
              Nutrition
            </div>
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                nutritionExpanded && "rotate-90"
              )}
            />
          </button>

          {nutritionExpanded && (
            <div className="mt-1 ml-3 pl-3 border-l border-border/50 space-y-0.5">
              {nutritionNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-150",
                      isActive
                        ? "text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Coming Soon Modules */}
        <div className="mt-2 space-y-0.5">
          {[
            { name: "Fitness", icon: Dumbbell },
            { name: "Finance", icon: Wallet },
            { name: "Biology", icon: Dna },
          ].map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground/50 cursor-not-allowed"
            >
              <item.icon className="h-4 w-4" />
              {item.name}
              <span className="ml-auto text-[10px] text-muted-foreground/40">soon</span>
            </div>
          ))}
        </div>
      </nav>

      {/* User section */}
      <div className="border-t border-border/50 p-3">
        <div className="flex items-center gap-2.5 px-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/80 to-violet-500/80 flex items-center justify-center text-white font-medium text-sm">
            {user?.name?.charAt(0) ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.name ?? "Loading..."}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email ?? ""}
            </p>
          </div>
          <button
            onClick={() => logout()}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
