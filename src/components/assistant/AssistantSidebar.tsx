"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getAuthToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Send, X, Sparkles, Loader2, Trash2, Bot } from "lucide-react";

interface AssistantContext {
  view: string;
  mealName?: string;
  components?: Array<{
    ingredientName: string;
    weightGrams: number;
    slot: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  }>;
  totals?: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  targets?: {
    caloricCeiling: number;
    proteinTarget: number;
    fatTarget: number;
    netCarbLimit: number;
  };
  availableIngredients?: Array<{
    name: string;
    category: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    fatPer100g: number;
    carbsPer100g: number;
  }>;
}

interface AssistantSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  context: AssistantContext;
}

export function AssistantSidebar({
  isOpen,
  onClose,
  sessionId,
  context,
}: AssistantSidebarProps) {
  const token = getAuthToken();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(
    api.assistant.getMessages,
    token && sessionId ? { token, sessionId } : "skip"
  );
  const chat = useAction(api.assistant.chat);
  const clearSession = useMutation(api.assistant.clearSession);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send initial greeting when opened with no messages
  useEffect(() => {
    if (isOpen && token && messages?.length === 0 && !isLoading) {
      handleSend("Hey! I'm starting to create a meal. Can you help me?");
    }
  }, [isOpen, messages?.length]);

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || !token || isLoading) return;

    setInput("");
    setIsLoading(true);

    try {
      await chat({
        token,
        sessionId,
        message: text,
        context,
      });
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    if (!token) return;
    await clearSession({ token, sessionId });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick action buttons
  const quickActions = [
    { label: "Suggest protein", message: "What protein should I add?" },
    { label: "Check macros", message: "How are my macros looking?" },
    { label: "Add vegetables", message: "What vegetables would pair well?" },
    { label: "Is this balanced?", message: "Is this meal balanced for my goals?" },
  ];

  return (
    <div
      className={cn(
        "fixed top-0 right-0 h-full w-96 bg-card border-l border-border shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Son of Anton</h3>
            <p className="text-xs text-muted-foreground">Nutrition Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleClear} title="Clear chat">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.map((msg) => (
          <div
            key={msg._id}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages && messages.length < 3 && (
        <div className="px-4 py-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-1">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => handleSend(action.message)}
                disabled={isLoading}
                className="text-xs px-2 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            rows={1}
            className="flex-1 resize-none bg-secondary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Button to open the assistant
export function AssistantTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      className="gap-2"
    >
      <Sparkles className="h-4 w-4" />
      Ask Assistant
    </Button>
  );
}
