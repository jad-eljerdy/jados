"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/sidebar";
import Link from "next/link";

const modules = [
  {
    name: "Nutrition",
    description: "Track meals, macros, and meal plans",
    href: "/nutrition",
    icon: "🥗",
    color: "bg-green-500",
    soon: true,
  },
  {
    name: "Fitness",
    description: "Workouts, progress, and routines",
    href: "/fitness",
    icon: "💪",
    color: "bg-blue-500",
    soon: true,
  },
  {
    name: "Finance",
    description: "Budget tracking and investments",
    href: "/finance",
    icon: "💰",
    color: "bg-yellow-500",
    soon: true,
  },
  {
    name: "Tasks",
    description: "Todo lists and project management",
    href: "/tasks",
    icon: "✓",
    color: "bg-purple-500",
    soon: true,
  },
];

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />
      <main className="flex-1 overflow-auto pt-14 md:pt-0 p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            {getGreeting()}, {user?.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="text-zinc-400 mt-1">
            Welcome to your life operating system
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 rounded-xl p-6">
            <p className="text-sm text-zinc-400">Today&apos;s Focus</p>
            <p className="text-2xl font-bold text-white mt-1">Get Started</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-6">
            <p className="text-sm text-zinc-400">Active Modules</p>
            <p className="text-2xl font-bold text-white mt-1">0 / 4</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-6">
            <p className="text-sm text-zinc-400">Days Active</p>
            <p className="text-2xl font-bold text-white mt-1">1</p>
          </div>
        </div>

        {/* Modules Grid */}
        <h2 className="text-lg font-semibold text-white mb-4">Life Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((module) => (
            <Link
              key={module.name}
              href={module.soon ? "#" : module.href}
              className={`
                relative bg-zinc-900 rounded-xl p-6 
                transition-all hover:bg-zinc-800
                ${module.soon ? "cursor-not-allowed opacity-60" : ""}
              `}
            >
              {module.soon && (
                <span className="absolute top-4 right-4 text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full">
                  Coming soon
                </span>
              )}
              <div
                className={`${module.color} h-12 w-12 rounded-xl flex items-center justify-center text-2xl mb-4`}
              >
                {module.icon}
              </div>
              <h3 className="text-lg font-semibold text-white">{module.name}</h3>
              <p className="text-sm text-zinc-400 mt-1">{module.description}</p>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-zinc-500">
          <p>JadOS v0.1.0 — Your holistic life operating system</p>
        </div>
      </main>
    </div>
  );
}
