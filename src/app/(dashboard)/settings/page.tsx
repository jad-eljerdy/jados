"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthToken } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

export default function GlobalSettingsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const token = getAuthToken();

  const globalSettings = useQuery(api.globalSettings.get, token ? { token } : "skip");
  const updateGlobalSettings = useMutation(api.globalSettings.update);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // AI Settings
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("anthropic/claude-sonnet-4-20250514");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (globalSettings) {
      setAiModel(globalSettings.aiModel || "anthropic/claude-sonnet-4-20250514");
    }
  }, [globalSettings]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setSuccess(false);
    
    try {
      await updateGlobalSettings({
        token,
        aiProvider: "openrouter",
        aiModel,
        ...(aiApiKey ? { aiApiKey } : {}),
      });
      setSuccess(true);
      setAiApiKey(""); // Clear after save for security
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
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
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground mb-8">Global configuration for JadOS</p>

          {/* AI Provider */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>AI Assistant</CardTitle>
              <CardDescription>
                Configure the AI provider for in-app assistants across all modules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    OpenRouter API Key
                  </label>
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Get API key <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder={globalSettings?.hasApiKey ? "••••••••••••••••" : "sk-or-v1-..."}
                />
                {globalSettings?.hasApiKey && (
                  <p className="text-xs text-green-500 mt-1">✓ API key configured</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Model ID
                  </label>
                  <a
                    href="https://openrouter.ai/models"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Browse models <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Input
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="anthropic/claude-sonnet-4-20250514"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste any model ID from OpenRouter (e.g., anthropic/claude-sonnet-4-20250514, openai/gpt-4o)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Future settings sections */}
          <Card className="mb-6 opacity-50">
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Coming soon — connect external services</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Calendar sync, health apps, finance APIs...
              </p>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} loading={saving} size="lg">
              Save Settings
            </Button>
            {success && (
              <span className="text-sm text-green-500">✓ Settings saved</span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
