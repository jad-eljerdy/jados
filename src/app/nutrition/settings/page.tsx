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

export default function NutritionSettingsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const token = getAuthToken();

  const config = useQuery(api.nutritionConfig.getConfig, token ? { token } : "skip");
  const globalSettings = useQuery(api.globalSettings.get, token ? { token } : "skip");
  const initializeConfig = useMutation(api.nutritionConfig.initializeConfig);
  const updateConfig = useMutation(api.nutritionConfig.updateConfig);
  const updateGlobalSettings = useMutation(api.globalSettings.update);

  const [saving, setSaving] = useState(false);
  const [savingAI, setSavingAI] = useState(false);
  const [success, setSuccess] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);

  // Form state
  const [caloricCeiling, setCaloricCeiling] = useState(1650);
  const [proteinTarget, setProteinTarget] = useState(120);
  const [fatTarget, setFatTarget] = useState(120);
  const [netCarbLimit, setNetCarbLimit] = useState(25);
  const [renalProtection, setRenalProtection] = useState(true);
  const [hypertensionManagement, setHypertensionManagement] = useState(true);
  const [ketoProtocol, setKetoProtocol] = useState(true);
  const [sodiumDailyLimit, setSodiumDailyLimit] = useState(2300);
  const [potassiumDailyMinimum, setPotassiumDailyMinimum] = useState(3500);
  const [scheduleMode, setScheduleMode] = useState<"omad" | "weekend_if" | "custom">("omad");
  const [weekendMealSlots, setWeekendMealSlots] = useState(2);
  const [currentWeight, setCurrentWeight] = useState<number | undefined>();
  const [goalWeight, setGoalWeight] = useState<number | undefined>();

  // AI Assistant state
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("anthropic/claude-3.5-sonnet");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (globalSettings) {
      setAiModel(globalSettings.aiModel || "anthropic/claude-3.5-sonnet");
      // Don't populate the API key field for security
    }
  }, [globalSettings]);

  useEffect(() => {
    if (config && config.exists !== false) {
      setCaloricCeiling(config.caloricCeiling);
      setProteinTarget(config.proteinTarget);
      setFatTarget(config.fatTarget);
      setNetCarbLimit(config.netCarbLimit);
      setRenalProtection(config.renalProtection);
      setHypertensionManagement(config.hypertensionManagement);
      setKetoProtocol(config.ketoProtocol);
      setSodiumDailyLimit(config.sodiumDailyLimit ?? 2300);
      setPotassiumDailyMinimum(config.potassiumDailyMinimum ?? 3500);
      setScheduleMode(config.scheduleMode);
      setWeekendMealSlots(config.weekendMealSlots ?? 2);
      setCurrentWeight(config.currentWeight);
      setGoalWeight(config.goalWeight);
    }
  }, [config]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setSuccess(false);

    try {
      // Initialize if doesn't exist
      if (config?.exists === false) {
        await initializeConfig({ token });
      }

      await updateConfig({
        token,
        caloricCeiling,
        proteinTarget,
        fatTarget,
        netCarbLimit,
        renalProtection,
        hypertensionManagement,
        ketoProtocol,
        sodiumDailyLimit,
        potassiumDailyMinimum,
        scheduleMode,
        weekendMealSlots,
        currentWeight,
        goalWeight,
      });
      setSuccess(true);
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
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-foreground mb-2">Nutrition Settings</h1>
          <p className="text-muted-foreground mb-8">Configure your dietary targets and medical constraints</p>

          {/* Caloric & Macro Targets */}
          <section className="bg-card rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Daily Targets</h2>
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="caloricCeiling"
                type="number"
                label="Caloric Ceiling (kcal)"
                value={caloricCeiling}
                onChange={(e) => setCaloricCeiling(Number(e.target.value))}
              />
              <Input
                id="proteinTarget"
                type="number"
                label="Protein Target (g)"
                value={proteinTarget}
                onChange={(e) => setProteinTarget(Number(e.target.value))}
              />
              <Input
                id="fatTarget"
                type="number"
                label="Fat Target (g)"
                value={fatTarget}
                onChange={(e) => setFatTarget(Number(e.target.value))}
              />
              <Input
                id="netCarbLimit"
                type="number"
                label="Net Carb Limit (g)"
                value={netCarbLimit}
                onChange={(e) => setNetCarbLimit(Number(e.target.value))}
              />
            </div>
          </section>

          {/* Medical Flags */}
          <section className="bg-card rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Medical Protocols</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ketoProtocol}
                  onChange={(e) => setKetoProtocol(e.target.checked)}
                  className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-green-600 focus:ring-green-600"
                />
                <div>
                  <span className="text-foreground font-medium">Keto Protocol</span>
                  <p className="text-sm text-muted-foreground">Enforce net carb limits across all meals</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={renalProtection}
                  onChange={(e) => setRenalProtection(e.target.checked)}
                  className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-green-600 focus:ring-green-600"
                />
                <div>
                  <span className="text-foreground font-medium">Renal Protection</span>
                  <p className="text-sm text-muted-foreground">Cap protein density, highlight low-purine sources</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hypertensionManagement}
                  onChange={(e) => setHypertensionManagement(e.target.checked)}
                  className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-green-600 focus:ring-green-600"
                />
                <div>
                  <span className="text-foreground font-medium">Hypertension Management</span>
                  <p className="text-sm text-muted-foreground">Track sodium:potassium ratios</p>
                </div>
              </label>

              {hypertensionManagement && (
                <div className="grid grid-cols-2 gap-4 ml-8 pt-2">
                  <Input
                    id="sodiumDailyLimit"
                    type="number"
                    label="Sodium Limit (mg)"
                    value={sodiumDailyLimit}
                    onChange={(e) => setSodiumDailyLimit(Number(e.target.value))}
                  />
                  <Input
                    id="potassiumDailyMinimum"
                    type="number"
                    label="Potassium Minimum (mg)"
                    value={potassiumDailyMinimum}
                    onChange={(e) => setPotassiumDailyMinimum(Number(e.target.value))}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Schedule Mode */}
          <section className="bg-card rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Eating Schedule</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="scheduleMode"
                  checked={scheduleMode === "omad"}
                  onChange={() => setScheduleMode("omad")}
                  className="w-5 h-5 bg-zinc-800 border-zinc-700 text-green-600 focus:ring-green-600"
                />
                <div>
                  <span className="text-foreground font-medium">OMAD Standard</span>
                  <p className="text-sm text-muted-foreground">1 meal per day, Mon-Sun</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="scheduleMode"
                  checked={scheduleMode === "weekend_if"}
                  onChange={() => setScheduleMode("weekend_if")}
                  className="w-5 h-5 bg-zinc-800 border-zinc-700 text-green-600 focus:ring-green-600"
                />
                <div>
                  <span className="text-foreground font-medium">Weekend IF</span>
                  <p className="text-sm text-muted-foreground">1 meal Mon-Fri, multiple meals Sat-Sun</p>
                </div>
              </label>

              {scheduleMode === "weekend_if" && (
                <div className="ml-8 pt-2">
                  <Input
                    id="weekendMealSlots"
                    type="number"
                    label="Weekend Meal Slots"
                    value={weekendMealSlots}
                    onChange={(e) => setWeekendMealSlots(Number(e.target.value))}
                    min={1}
                    max={4}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Biometrics (temporary) */}
          <section className="bg-card rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-1">Biometrics</h2>
            <p className="text-sm text-zinc-500 mb-4">Will move to Biology module</p>
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="currentWeight"
                type="number"
                label="Current Weight (kg)"
                value={currentWeight ?? ""}
                onChange={(e) => setCurrentWeight(e.target.value ? Number(e.target.value) : undefined)}
                step="0.1"
              />
              <Input
                id="goalWeight"
                type="number"
                label="Goal Weight (kg)"
                value={goalWeight ?? ""}
                onChange={(e) => setGoalWeight(e.target.value ? Number(e.target.value) : undefined)}
                step="0.1"
              />
            </div>
          </section>

          {/* Save Button */}
          <div className="flex items-center gap-3 mb-12">
            <Button onClick={handleSave} loading={saving} size="lg">
              Save Nutrition Settings
            </Button>
            {success && (
              <span className="text-sm text-green-400">✓ Settings saved</span>
            )}
          </div>

          {/* AI Assistant Settings */}
          <div className="border-t border-border pt-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">AI Assistant</h1>
            <p className="text-muted-foreground mb-8">Configure the in-app nutrition assistant</p>

            <section className="bg-card rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">OpenRouter API</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Get your API key at{" "}
                <a 
                  href="https://openrouter.ai/keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  openrouter.ai/keys
                </a>
              </p>
              
              <div className="space-y-4">
                <Input
                  id="aiApiKey"
                  type="password"
                  label="API Key"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder={globalSettings?.hasApiKey ? "••••••••••••••••" : "sk-or-..."}
                />

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Model</label>
                  <select
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <optgroup label="Claude (Anthropic)">
                      <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (recommended)</option>
                      <option value="anthropic/claude-3-haiku">Claude 3 Haiku (fast & cheap)</option>
                      <option value="anthropic/claude-3-opus">Claude 3 Opus (most capable)</option>
                    </optgroup>
                    <optgroup label="GPT (OpenAI)">
                      <option value="openai/gpt-4o">GPT-4o</option>
                      <option value="openai/gpt-4o-mini">GPT-4o Mini (fast & cheap)</option>
                      <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
                    </optgroup>
                    <optgroup label="Other">
                      <option value="google/gemini-pro-1.5">Gemini Pro 1.5</option>
                      <option value="meta-llama/llama-3.1-70b-instruct">Llama 3.1 70B</option>
                      <option value="mistralai/mixtral-8x7b-instruct">Mixtral 8x7B</option>
                    </optgroup>
                  </select>
                </div>

                {globalSettings?.hasApiKey && (
                  <p className="text-xs text-green-400">✓ API key configured</p>
                )}
              </div>
            </section>

            <div className="flex items-center gap-3">
              <Button 
                onClick={async () => {
                  if (!token) return;
                  setSavingAI(true);
                  setAiSuccess(false);
                  try {
                    await updateGlobalSettings({
                      token,
                      aiProvider: "openrouter",
                      aiModel,
                      ...(aiApiKey ? { aiApiKey } : {}),
                    });
                    setAiSuccess(true);
                    setAiApiKey(""); // Clear the input after save
                    setTimeout(() => setAiSuccess(false), 3000);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setSavingAI(false);
                  }
                }} 
                loading={savingAI} 
                size="lg"
              >
                Save AI Settings
              </Button>
              {aiSuccess && (
                <span className="text-sm text-green-400">✓ AI settings saved</span>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
