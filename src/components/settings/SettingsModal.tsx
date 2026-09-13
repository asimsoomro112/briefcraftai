"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { isFirestoreConfigured } from "@/lib/firestore";
import { X, CheckCircle, AlertCircle, Cpu, Key, Database, Sparkles, Loader2, RefreshCw, Clock } from "lucide-react";
import { GeminiModelId } from "@/types";

interface SchedulerInfo {
  keyPoolCount: number;
  timeUntilResetFormatted: string;
  keys?: { index: number; masked: string; source: string }[];
}

export function SettingsModal() {
  const { isSettingsOpen, setIsSettingsOpen, settings, updateSettings } = useApp();
  const [apiKeyInput, setApiKeyInput] = useState(settings.customApiKey || "");
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [schedulerInfo, setSchedulerInfo] = useState<SchedulerInfo | null>(null);

  useEffect(() => {
    if (isSettingsOpen) {
      fetch("/api/pipeline")
        .then((res) => res.json())
        .then((data) => {
          if (data?.schedulerInfo) {
            setSchedulerInfo(data.schedulerInfo);
          }
        })
        .catch(() => {});
    }
  }, [isSettingsOpen]);

  if (!isSettingsOpen) return null;

  const handleTestAndSave = async () => {
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKeyInput,
          model: settings.model,
        }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setTestResult({
          success: true,
          message: `Connected successfully to ${data.model}! Server key pool: ${data.serverKeyPoolCount} accounts active.`,
        });
        if (apiKeyInput.trim()) {
          updateSettings({ customApiKey: apiKeyInput.trim() });
        }
      } else {
        setTestResult({
          success: false,
          message: data.message || "Key verification failed. Check credentials or quotas.",
        });
      }
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Network test failed.",
      });
    } finally {
      setTestingKey(false);
    }
  };

  const handleClearKey = () => {
    setApiKeyInput("");
    updateSettings({ customApiKey: undefined });
    setTestResult(null);
  };

  const firestoreReady = isFirestoreConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl glass-panel specular-highlight border border-zinc-200 dark:border-white/10 p-6 sm:p-7 shadow-2xl space-y-6 bg-white dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Engine & Key Pool Config</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Zero-billing Gemini 3 chain & multi-account rotation</p>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors active:scale-95 touch-manipulation"
            aria-label="Close settings modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gemini 3 Zero-Billing Model Hierarchy */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Gemini 3 Zero-Billing Hierarchy
            </label>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
              Auto-Fallback Chain
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
            Ordered strictly by free-tier headroom. If quota is exhausted on the primary model across all keys, the pipeline rotates to Fallback 1, then Fallback 2.
          </p>

          <div className="grid grid-cols-1 gap-2.5">
            {/* 3.1 Flash-Lite (Primary) */}
            <button
              type="button"
              onClick={() => updateSettings({ model: "gemini-3.1-flash-lite" as GeminiModelId })}
              className={`p-3 rounded-xl border text-left transition-all ${
                settings.model === "gemini-3.1-flash-lite"
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-zinc-900 dark:text-white shadow-sm shadow-indigo-500/20"
                  : "border-zinc-200 bg-zinc-50/80 hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/5 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 dark:hover:border-white/15"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  1. gemini-3.1-flash-lite (Primary)
                </span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold">
                  30 RPM / ~1,500 RPD
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                GA & active through May 2027. Most generous free tier in Gemini 3. Matches 2.5 Flash quality with 2.5s safe pacing.
              </p>
            </button>

            {/* 3.5 Flash-Lite (Fallback 1) */}
            <button
              type="button"
              onClick={() => updateSettings({ model: "gemini-3.5-flash-lite" as GeminiModelId })}
              className={`p-3 rounded-xl border text-left transition-all ${
                settings.model === "gemini-3.5-flash-lite"
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-zinc-900 dark:text-white shadow-sm shadow-indigo-500/20"
                  : "border-zinc-200 bg-zinc-50/80 hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/5 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 dark:hover:border-white/15"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                  2. gemini-3.5-flash-lite (Fallback 1)
                </span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold">
                  15 RPM / ~500 RPD
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                Engaged once primary daily quota is used up across all rotated accounts. 4.5s safe pacing.
              </p>
            </button>

            {/* 3.7 Flash (Fallback 2) */}
            <button
              type="button"
              onClick={() => updateSettings({ model: "gemini-3.7-flash" as GeminiModelId })}
              className={`p-3 rounded-xl border text-left transition-all ${
                settings.model === "gemini-3.7-flash"
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-zinc-900 dark:text-white shadow-sm shadow-indigo-500/20"
                  : "border-zinc-200 bg-zinc-50/80 hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/5 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 dark:hover:border-white/15"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  3. gemini-3.7-flash (Last-Resort Fallback)
                </span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold">
                  10 RPM / ~200 RPD
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                High-reasoning model invoked when both lite tiers are exhausted. 6.5s safe pacing.
              </p>
            </button>
          </div>
        </div>

        {/* Multi-Account Key Rotation Status */}
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
              Multi-Account Key Rotation Pool
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold">
              {schedulerInfo?.keyPoolCount || 1} Account{schedulerInfo?.keyPoolCount === 1 ? "" : "s"} Configured
            </span>
          </div>

          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Support up to 3 keys in <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[11px]">.env.local</code>:{" "}
            <code className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">GEMINI_API_KEY_1</code>,{" "}
            <code className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">GEMINI_API_KEY_2</code>, and{" "}
            <code className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">GEMINI_API_KEY_3</code>. If Key 1 hits quota, Key 2 takes over automatically.
          </p>

          {schedulerInfo && (
            <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-200 dark:border-white/5 text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Pacific Midnight Quota Reset:
              </span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200 font-medium">
                in {schedulerInfo.timeUntilResetFormatted}
              </span>
            </div>
          )}
        </div>

        {/* Custom Browser API Key Override */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-400 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Custom API Key Override (Optional)
            </label>
            {settings.customApiKey && (
              <button
                onClick={handleClearKey}
                className="text-[11px] text-red-500 hover:underline"
              >
                Clear Key
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="password"
              placeholder="AIzaSy... (Overrides server keys when present)"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900"
            />
            <button
              onClick={handleTestAndSave}
              disabled={testingKey}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-medium text-white transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-500/25"
            >
              {testingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Verify & Save"}
            </button>
          </div>

          {testResult && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                testResult.success
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20"
                  : "bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-500/20"
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Persistence Status */}
        <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Persistence Engine & Resumable Checkpoints
            </span>
            <span
              className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                firestoreReady
                  ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                  : "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
              }`}
            >
              {firestoreReady ? "Firestore Cloud Synced" : "Local Storage Mode"}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Pipeline steps (<code className="text-indigo-600 dark:text-indigo-400">batch-1</code>,{" "}
            <code className="text-indigo-600 dark:text-indigo-400">batch-2</code>,{" "}
            <code className="text-indigo-600 dark:text-indigo-400">synthesis</code>) are checkpointed in real-time.
          </p>
        </div>

        {/* Close button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium dark:text-white transition-colors border border-zinc-200 dark:border-white/5"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
