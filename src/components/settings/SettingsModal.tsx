"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { isFirestoreConfigured } from "@/lib/firestore";
import { X, CheckCircle, AlertCircle, Cpu, Key, Database, Sparkles, Loader2 } from "lucide-react";

export function SettingsModal() {
  const { isSettingsOpen, setIsSettingsOpen, settings, updateSettings } = useApp();
  const [apiKeyInput, setApiKeyInput] = useState(settings.customApiKey || "");
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

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
        setTestResult({ success: true, message: `Connected! Response: "${data.reply}"` });
        updateSettings({ customApiKey: apiKeyInput });
      } else {
        setTestResult({
          success: false,
          message: data.message || "Key verification failed. Check credentials or quotas.",
        });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Network test failed." });
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
      <div className="relative w-full max-w-lg rounded-2xl glass-panel specular-highlight border border-zinc-200 dark:border-white/10 p-6 sm:p-7 shadow-2xl space-y-6 bg-white dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Engine & Environment</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Configure models, API keys, and persistence</p>
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

        {/* Model Selection */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Active Gemini Model
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 3.8 Flash (Default) */}
            <button
              type="button"
              onClick={() => updateSettings({ model: "gemini-3.8-flash" })}
              className={`p-3 rounded-xl border text-left transition-all ${
                settings.model === "gemini-3.8-flash"
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-zinc-900 dark:text-white shadow-sm shadow-indigo-500/20"
                  : "border-zinc-200 bg-zinc-50/80 hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/5 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 dark:hover:border-white/15"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">gemini-3.8-flash</span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold">
                  Default
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                Google&apos;s GA workhorse. Fast, lower cost, high-level thinking, and search grounding.
              </p>
            </button>

            {/* 3.1 Pro (Fallback) */}
            <button
              type="button"
              onClick={() => updateSettings({ model: "gemini-3.1-pro-preview" })}
              className={`p-3 rounded-xl border text-left transition-all ${
                settings.model === "gemini-3.1-pro-preview"
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-zinc-900 dark:text-white shadow-sm shadow-indigo-500/20"
                  : "border-zinc-200 bg-zinc-50/80 hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/5 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 dark:hover:border-white/15"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300">gemini-3.1-pro-preview</span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-semibold">
                  Fallback
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                Pro-tier model for deep & complex reasoning briefs requiring a second opinion.
              </p>
            </button>
          </div>
        </div>

        {/* Gemini API Key */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-400 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Gemini API Key
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
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Keys are processed server-side only. You can also specify{" "}
            <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-indigo-700 dark:text-indigo-300 text-[11px]">
              GEMINI_API_KEY
            </code>{" "}
            in your <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-indigo-700 dark:text-indigo-300 text-[11px]">.env.local</code> file.
          </p>

          <div className="flex gap-2">
            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900"
            />
            <button
              onClick={handleTestAndSave}
              disabled={testingKey || !apiKeyInput}
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
              Persistence Engine
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
            {firestoreReady
              ? "Connected to Firebase Firestore. Client briefs and prompt versions are automatically synced."
              : "Using instant browser storage. To connect cloud Firestore, add NEXT_PUBLIC_FIREBASE_* vars to .env.local."}
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
