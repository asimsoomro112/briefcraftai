"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "@/context/AppContext";
import { SiteGoal, PipelineJobState, GeneratedPromptData } from "@/types";
import { saveClientBrief, saveGeneratedPrompt } from "@/lib/firestore";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Globe,
  Palette,
  Layout,
  Sliders,
  Target,
  Layers,
  Clock,
  ExternalLink,
  Flame,
  Key,
  Hourglass,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

const STANDARD_TONES = [
  "Luxury",
  "Minimal",
  "Playful",
  "Corporate",
  "Bold",
  "Editorial",
];

const STANDARD_PAGES = [
  "Home",
  "About",
  "Services",
  "Products/Shop",
  "Portfolio",
  "Blog",
  "Contact",
  "Pricing",
  "Booking",
];

const STANDARD_FEATURES = [
  "contact form",
  "e-commerce",
  "booking/calendar",
  "blog/CMS",
  "multi-language",
  "animations",
  "dashboard/login",
  "newsletter signup",
];

const GOALS: { id: SiteGoal; label: string; desc: string }[] = [
  { id: "leads", label: "Lead Generation", desc: "High conversion consultation/quote forms & phone inquiries" },
  { id: "sales", label: "Direct Sales", desc: "Showcase products/inventory, pricing tiers, and checkout CTA" },
  { id: "portfolio", label: "Work & Credibility", desc: "Curated case studies, client roster, and press features" },
  { id: "booking", label: "Appointment Booking", desc: "Calendar integration, service menus, and reservation flows" },
  { id: "informational", label: "Authority & Education", desc: "Thought leadership articles, documentation, and company story" },
];

export function IntakeWizard() {
  const {
    activeBrief,
    updateActiveBrief,
    setCurrentResult,
    generationState,
    setGenerationState,
    refreshClientsList,
    setCurrentView,
    settings,
    updateSettings,
  } = useApp();

  const [step, setStep] = useState(1);
  const [customToneInput, setCustomToneInput] = useState("");
  const [customPageInput, setCustomPageInput] = useState("");
  const [customFeatureInput, setCustomFeatureInput] = useState("");
  const [customKeyInput, setCustomKeyInput] = useState(settings.customApiKey || "");
  const [keySavedNotice, setKeySavedNotice] = useState(false);
  const [activeCheckpoint, setActiveCheckpoint] = useState<PipelineJobState | null>(null);

  const totalSteps = 7;

  // Poll / check for saved resumable checkpoint for active brief
  useEffect(() => {
    let active = true;
    if (!activeBrief.id) return;

    fetch(`/api/pipeline?briefId=${activeBrief.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data?.jobState && data.jobState.status !== "completed") {
          setActiveCheckpoint(data.jobState);
        } else {
          setActiveCheckpoint(null);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [activeBrief.id]);

  // Proactive rate-limiter 1-second live countdown ticker
  useEffect(() => {
    if (!generationState.isWaiting || !generationState.waitSecondsRemaining || generationState.waitSecondsRemaining <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setGenerationState((prev) => {
        if (!prev.waitSecondsRemaining || prev.waitSecondsRemaining <= 1) {
          return { ...prev, isWaiting: false, waitSecondsRemaining: 0 };
        }
        return { ...prev, waitSecondsRemaining: prev.waitSecondsRemaining - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [generationState.isWaiting, generationState.waitSecondsRemaining, setGenerationState]);

  // Presets for quick 1-click test
  const loadPreset = (presetType: "jewelry" | "saas" | "architect") => {
    if (presetType === "jewelry") {
      updateActiveBrief({
        clientName: "Aura Haute Joaillerie",
        industry: "Luxury Fine Jewelry & Bespoke Atelier",
        description:
          "An artisan high-jewelry house in Paris crafting bespoke, conflict-free diamond and sapphire heirlooms for discerning collectors.",
        targetAudience: "Affluent private clients, luxury gift-givers, and collectors aged 30-65 seeking one-of-a-kind bespoke pieces.",
        primaryGoal: "leads",
        tones: ["Luxury", "Editorial", "Minimal"],
        pages: ["Home", "About", "Services", "Portfolio", "Contact", "Bespoke Concierge"],
        features: ["contact form", "animations", "newsletter signup", "VIP concierge booking"],
        brand: {
          hasExistingBrand: true,
          suggestBrand: false,
          primaryColor: "#0f172a",
          secondaryColor: "#d4af37",
          accentColor: "#f8fafc",
          brandNotes: "Warm champagne gold accents against deep midnight obsidian with serif elegance.",
        },
        competitorUrls: ["https://cartier.com", "https://boucheron.com"],
        timelineNotes: "Launch in 4 weeks for Paris Couture Week.",
      });
    } else if (presetType === "saas") {
      updateActiveBrief({
        clientName: "Synthex Engine",
        industry: "Enterprise AI Infrastructure & Autonomous Pipelines",
        description:
          "High-throughput developer platform providing real-time data orchestration and autonomous agent execution for Fortune 500 engineering teams.",
        targetAudience: "CTOs, VP of Engineering, and Principal Systems Architects building distributed AI workflows.",
        primaryGoal: "sales",
        tones: ["Corporate", "Bold", "Minimal"],
        pages: ["Home", "Products/Shop", "Pricing", "Blog", "Contact"],
        features: ["dashboard/login", "animations", "newsletter signup", "contact form", "multi-language"],
        brand: {
          hasExistingBrand: false,
          suggestBrand: true,
          primaryColor: "#6366f1",
          secondaryColor: "#06b6d4",
          accentColor: "#ec4899",
          brandNotes: "High-contrast cybernetic violet and teal highlights over graphite.",
        },
        competitorUrls: ["https://vercel.com", "https://linear.app"],
        timelineNotes: "Need prompt to generate MVP for upcoming Series A pitch.",
      });
    } else {
      updateActiveBrief({
        clientName: "Vanguard Space Design",
        industry: "Sustainable Architecture & Spatial Planning",
        description:
          "A biophilic architecture and interior design studio crafting carbon-neutral modern residences and creative cultural campuses.",
        targetAudience: "Forward-thinking homeowners, eco-conscious property developers, and civic cultural institutions.",
        primaryGoal: "portfolio",
        tones: ["Minimal", "Editorial"],
        pages: ["Home", "About", "Portfolio", "Services", "Contact"],
        features: ["animations", "contact form", "newsletter signup"],
        brand: {
          hasExistingBrand: true,
          suggestBrand: false,
          primaryColor: "#292524",
          secondaryColor: "#84cc16",
          accentColor: "#fafaf9",
          brandNotes: "Earthy warm stone with vibrant botanical lime accents.",
        },
        competitorUrls: ["https://snohetta.com", "https://fosterandpartners.com"],
        timelineNotes: "Target launch in 6 weeks.",
      });
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
    }
  };

  // Tones toggle
  const toggleTone = (tone: string) => {
    const current = activeBrief.tones || [];
    if (current.includes(tone)) {
      updateActiveBrief({ tones: current.filter((t) => t !== tone) });
    } else {
      updateActiveBrief({ tones: [...current, tone] });
    }
  };

  const addCustomTone = () => {
    if (customToneInput.trim() && !activeBrief.tones.includes(customToneInput.trim())) {
      updateActiveBrief({ tones: [...activeBrief.tones, customToneInput.trim()] });
      setCustomToneInput("");
    }
  };

  // Pages toggle
  const togglePage = (p: string) => {
    const current = activeBrief.pages || [];
    if (current.includes(p)) {
      updateActiveBrief({ pages: current.filter((item) => item !== p) });
    } else {
      updateActiveBrief({ pages: [...current, p] });
    }
  };

  const addCustomPage = () => {
    if (customPageInput.trim() && !activeBrief.pages.includes(customPageInput.trim())) {
      updateActiveBrief({ pages: [...activeBrief.pages, customPageInput.trim()] });
      setCustomPageInput("");
    }
  };

  // Features toggle
  const toggleFeature = (feat: string) => {
    const current = activeBrief.features || [];
    if (current.includes(feat)) {
      updateActiveBrief({ features: current.filter((f) => f !== feat) });
    } else {
      updateActiveBrief({ features: [...current, feat] });
    }
  };

  const addCustomFeature = () => {
    if (customFeatureInput.trim() && !activeBrief.features.includes(customFeatureInput.trim())) {
      updateActiveBrief({ features: [...activeBrief.features, customFeatureInput.trim()] });
      setCustomFeatureInput("");
    }
  };

  // Competitor URLs
  const updateCompetitorUrl = (index: number, val: string) => {
    const urls = [...(activeBrief.competitorUrls || [])];
    urls[index] = val;
    updateActiveBrief({ competitorUrls: urls.filter((u) => u !== undefined) });
  };

  const addCompetitorField = () => {
    if ((activeBrief.competitorUrls?.length || 0) < 3) {
      updateActiveBrief({ competitorUrls: [...(activeBrief.competitorUrls || []), ""] });
    }
  };

  const removeCompetitorField = (index: number) => {
    const urls = [...(activeBrief.competitorUrls || [])];
    urls.splice(index, 1);
    updateActiveBrief({ competitorUrls: urls });
  };

  // Final Generation Trigger
  const handleGenerate = async (overrideKey?: string) => {
    if (!activeBrief.clientName || !activeBrief.industry) {
      alert("Please ensure Client Name and Industry are filled out.");
      setStep(1);
      return;
    }

    const keyToUse = overrideKey !== undefined ? overrideKey : settings.customApiKey;

    try {
      setGenerationState({
        step: "running",
        currentStepNumber: 1,
        totalSteps: 3,
        message: "Initializing Gemini 3 zero-billing pipeline for " + activeBrief.industry + "...",
        progressPercent: 15,
        isWaiting: false,
        isQuotaWall: false,
      });

      // Save initial brief
      await saveClientBrief(activeBrief);
      await refreshClientsList();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (keyToUse) {
        headers["x-gemini-api-key"] = keyToUse;
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          brief: activeBrief,
          model: settings.model,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = "Gemini is under heavy load right now, please try again in a minute.";
        try {
          const parsed = JSON.parse(errText);
          errMsg = parsed.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      if (!response.body) {
        throw new Error("Empty response body from generation pipeline.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let generatedResult: GeneratedPromptData | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === "progress") {
              setGenerationState((prev) => ({
                ...prev,
                step: "running",
                currentStepNumber: msg.stepNumber || prev.currentStepNumber || 1,
                totalSteps: msg.totalSteps || 3,
                currentStepId: msg.stepId,
                message: msg.message || "",
                progressPercent: msg.progressPercent || prev.progressPercent || 25,
                isWaiting: false,
                waitSecondsRemaining: 0,
                isQuotaWall: false,
                activeModel: msg.modelUsed || prev.activeModel,
                activeKeyMask: msg.keyMask || prev.activeKeyMask,
              }));
            } else if (msg.type === "waiting") {
              setGenerationState((prev) => ({
                ...prev,
                step: "running",
                currentStepNumber: msg.stepNumber || prev.currentStepNumber || 1,
                totalSteps: msg.totalSteps || 3,
                currentStepId: msg.stepId,
                message: msg.message || "",
                isWaiting: true,
                waitSecondsRemaining: msg.waitSecondsRemaining || 0,
                isQuotaWall: false,
                activeModel: msg.modelUsed || prev.activeModel,
                activeKeyMask: msg.keyMask || prev.activeKeyMask,
              }));
            } else if (msg.type === "step_complete") {
              setGenerationState((prev) => ({
                ...prev,
                currentStepNumber: msg.stepNumber || prev.currentStepNumber,
                message: msg.message || "",
                progressPercent: msg.progressPercent || prev.progressPercent,
                isWaiting: false,
                waitSecondsRemaining: 0,
              }));
            } else if (msg.type === "quota_wall") {
              setGenerationState({
                step: "error",
                currentStepNumber: msg.stepNumber || 1,
                totalSteps: 3,
                message: msg.message || "",
                progressPercent: msg.progressPercent || 33,
                isWaiting: false,
                isQuotaWall: true,
                quotaWallResetTime: msg.quotaWallResetPacific,
                quotaWallRemainingFormatted: msg.quotaWallRemainingFormatted,
              });
              return;
            } else if (msg.type === "complete") {
              generatedResult = msg.data as GeneratedPromptData;
            } else if (msg.type === "error") {
              throw new Error(msg.error || "An error occurred during pipeline execution.");
            }
          } catch (e: unknown) {
            if (e instanceof Error && e.message.includes("quota")) {
              throw e;
            }
          }
        }
      }

      if (!generatedResult) {
        throw new Error("Pipeline interrupted before completing.");
      }

      setGenerationState({
        step: "persisting",
        currentStepNumber: 3,
        totalSteps: 3,
        message: "Persisting prompt to portfolio history...",
        progressPercent: 95,
      });

      // Save generated prompt to Firestore & Local storage
      await saveGeneratedPrompt(generatedResult);
      await refreshClientsList();
      setActiveCheckpoint(null);

      setCurrentResult(generatedResult);
      setGenerationState({
        step: "completed",
        currentStepNumber: 3,
        totalSteps: 3,
        message: "Complete! Rendering your production Bento Dashboard...",
        progressPercent: 100,
      });

      setTimeout(() => {
        setGenerationState({
          step: "idle",
          currentStepNumber: 0,
          totalSteps: 3,
          message: "",
          progressPercent: 0,
        });
        setCurrentView("results");
      }, 600);
    } catch (err: unknown) {
      console.error("Generation error:", err);
      const friendlyMsg = err instanceof Error ? err.message : "Gemini is experiencing temporary load, please try again.";

      setGenerationState((prev) => ({
        ...prev,
        step: "error",
        message: friendlyMsg,
        progressPercent: 0,
      }));
    }
  };

  const isStepValid = () => {
    if (step === 1) return activeBrief.clientName.trim() !== "" && activeBrief.industry.trim() !== "";
    if (step === 4) return activeBrief.pages.length > 0;
    return true;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Quick Presets Bar for Instant Dogfooding */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/5 shadow-sm text-xs">
        <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-400 font-medium">
          <Flame className="w-4 h-4 text-amber-500" />
          <span>Quick 1-Click Test Presets:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadPreset("jewelry")}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 border border-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:hover:text-white dark:border-white/5 transition-all text-xs font-medium active:scale-95 touch-manipulation flex items-center gap-1"
          >
            💎 Luxury Atelier
          </button>
          <button
            onClick={() => loadPreset("saas")}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 border border-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:hover:text-white dark:border-white/5 transition-all text-xs font-medium active:scale-95 touch-manipulation flex items-center gap-1"
          >
            ⚡ Enterprise AI SaaS
          </button>
          <button
            onClick={() => loadPreset("architect")}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 border border-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:hover:text-white dark:border-white/5 transition-all text-xs font-medium active:scale-95 touch-manipulation flex items-center gap-1"
          >
            🏛️ Biophilic Architecture
          </button>
        </div>
      </div>

      {/* Checkpoint Resumption Banner if an in-progress brief was paused */}
      {activeCheckpoint && activeCheckpoint.status !== "completed" && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 text-xs shadow-sm">
          <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-200">
            <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin-slow" />
            <div>
              <p className="font-semibold">
                Checkpoint Saved: Step {activeCheckpoint.currentStepIndex} of 3 completed previously
              </p>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                You can resume generation without re-running earlier completed steps.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleGenerate()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            Resume Step {activeCheckpoint.currentStepIndex + 1} ↗
          </button>
        </div>
      )}

      {/* Progress & Stepper Header */}
      <div className="bento-card p-5 space-y-3 specular-highlight">
        <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
          <span className="font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Step {step} of {totalSteps}: {getStepTitle(step)}
          </span>
          <span className="font-mono text-zinc-700 dark:text-zinc-300">{Math.round((step / totalSteps) * 100)}% Complete</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800/80 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
            transition={{ duration: 0.25 }}
          />
        </div>

        {/* Step dots */}
        <div className="grid grid-cols-7 gap-1 pt-1">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const stepNum = i + 1;
            const isDone = stepNum < step;
            const isCurrent = stepNum === step;
            return (
              <button
                key={stepNum}
                onClick={() => setStep(stepNum)}
                className={`h-1.5 rounded-full transition-all ${
                  isCurrent
                    ? "bg-indigo-600 shadow-sm shadow-indigo-500/50"
                    : isDone
                    ? "bg-indigo-300 dark:bg-indigo-900/60"
                    : "bg-zinc-200 dark:bg-zinc-800/40"
                }`}
                title={`Jump to step ${stepNum}: ${getStepTitle(stepNum)}`}
              />
            );
          })}
        </div>
      </div>

      {/* Wizard Step Content Card */}
      <div className="bento-card p-6 sm:p-8 relative min-h-[420px] flex flex-col justify-between specular-highlight">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
            className="space-y-6"
          >
            {/* Step 1: Overview */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="border-b border-zinc-200 dark:border-white/10 pb-3">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Client & Industry Overview
                  </h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    Enter the core business profile to seed the 2026 live web research engine.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Client / Business Name <span className="text-indigo-600 dark:text-indigo-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lumina Atelier"
                      value={activeBrief.clientName}
                      onChange={(e) => updateActiveBrief({ clientName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-300 dark:border-white/10 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Industry / Sector <span className="text-indigo-600 dark:text-indigo-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bespoke Jewelry / Web3 / Specialty Coffee"
                      value={activeBrief.industry}
                      onChange={(e) => updateActiveBrief({ industry: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-300 dark:border-white/10 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    One-Paragraph Description of What They Do
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe their value proposition, uniqueness, and offerings in a clear paragraph..."
                    value={activeBrief.description}
                    onChange={(e) => updateActiveBrief({ description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-300 dark:border-white/10 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Target Audience & Primary Goal */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="border-b border-zinc-200 dark:border-white/10 pb-3">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Target Audience & Primary Goal
                  </h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    Define who the site is speaking to and what main conversion metric matters most.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Target Audience</label>
                  <input
                    type="text"
                    placeholder="e.g. High-net-worth collectors, tech-forward founders, millennial homeowners..."
                    value={activeBrief.targetAudience}
                    onChange={(e) => updateActiveBrief({ targetAudience: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-300 dark:border-white/10 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Primary Goal of the Website
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {GOALS.map((g) => {
                      const selected = activeBrief.primaryGoal === g.id;
                      return (
                        <div
                          key={g.id}
                          onClick={() => updateActiveBrief({ primaryGoal: g.id })}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            selected
                              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 shadow-sm shadow-indigo-500/20"
                              : "border-zinc-200 bg-zinc-50/80 hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/5 dark:bg-zinc-900/50 dark:hover:border-white/15 dark:hover:bg-zinc-900"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-white">{g.label}</span>
                            {selected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                          </div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">{g.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Tone & Personality */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="border-b border-zinc-200 dark:border-white/10 pb-3">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Tone & Personality Chips
                  </h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    Select the aesthetic temperament. Stage A will use these to research tailored typography, scroll behavior, and hero kinetic styles.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {STANDARD_TONES.map((tone) => {
                    const isSelected = activeBrief.tones.includes(tone);
                    return (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => toggleTone(tone)}
                        className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 touch-manipulation ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30 border border-indigo-500"
                            : "bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 hover:text-zinc-900 dark:bg-zinc-900 dark:border-white/10 dark:text-zinc-400 dark:hover:text-white dark:hover:border-white/20"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        {tone}
                      </button>
                    );
                  })}
                  {/* Custom Tones */}
                  {activeBrief.tones
                    .filter((t) => !STANDARD_TONES.includes(t))
                    .map((custom) => (
                      <span
                        key={custom}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-100 dark:bg-purple-600/30 border border-purple-200 dark:border-purple-500/40 text-purple-800 dark:text-purple-200 flex items-center gap-1.5"
                      >
                        {custom}
                        <button
                          onClick={() => toggleTone(custom)}
                          className="hover:text-red-500 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                </div>

                {/* Add Custom Tone */}
                <div className="flex gap-2 max-w-sm pt-2">
                  <input
                    type="text"
                    placeholder="Add custom tone (e.g. Cyberpunk, Organic)..."
                    value={customToneInput}
                    onChange={(e) => setCustomToneInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTone())}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={addCustomTone}
                    className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white border border-zinc-200 dark:border-white/5 text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Pages Needed */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="border-b border-zinc-200 dark:border-white/10 pb-3">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Layout className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Pages & Sitemap Checklist
                  </h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    Select required sitemap pages or add custom landing sections.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {STANDARD_PAGES.map((page) => {
                    const isChecked = activeBrief.pages.includes(page);
                    return (
                      <div
                        key={page}
                        onClick={() => togglePage(page)}
                        className={`p-3 rounded-xl border cursor-pointer text-xs font-medium flex items-center justify-between transition-all ${
                          isChecked
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-900 dark:text-white shadow-sm shadow-indigo-500/20"
                            : "border-zinc-200 bg-zinc-50/80 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/5 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:border-white/15 dark:hover:text-zinc-200"
                        }`}
                      >
                        <span>{page}</span>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isChecked
                              ? "bg-indigo-600 border-indigo-400 text-white"
                              : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-800"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })}
                  {/* Custom Pages */}
                  {activeBrief.pages
                    .filter((p) => !STANDARD_PAGES.includes(p))
                    .map((custom) => (
                      <div
                        key={custom}
                        className="p-3 rounded-xl border border-purple-200 dark:border-purple-500/40 bg-purple-100 dark:bg-purple-500/10 text-xs font-medium text-purple-900 dark:text-purple-200 flex items-center justify-between"
                      >
                        <span className="truncate">{custom}</span>
                        <button onClick={() => togglePage(custom)} className="text-zinc-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                </div>

                {/* Add Custom Page */}
                <div className="flex gap-2 max-w-sm pt-2">
                  <input
                    type="text"
                    placeholder="Add custom page (e.g. VIP Atelier, Portal)..."
                    value={customPageInput}
                    onChange={(e) => setCustomPageInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomPage())}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={addCustomPage}
                    className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white border border-zinc-200 dark:border-white/5 text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Must-Have Features */}
            {step === 5 && (
              <div className="space-y-5">
                <div className="border-b border-zinc-200 dark:border-white/10 pb-3">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Must-Have Interactive Features
                  </h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    Specify functional components needed. The prompt will detail implementation logic and libraries.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {STANDARD_FEATURES.map((feat) => {
                    const isChecked = activeBrief.features.includes(feat);
                    return (
                      <div
                        key={feat}
                        onClick={() => toggleFeature(feat)}
                        className={`p-3 rounded-xl border cursor-pointer text-xs font-medium flex items-center justify-between transition-all capitalize ${
                          isChecked
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-900 dark:text-white shadow-sm shadow-indigo-500/20"
                            : "border-zinc-200 bg-zinc-50/80 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/5 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:border-white/15 dark:hover:text-zinc-200"
                        }`}
                      >
                        <span>{feat}</span>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isChecked
                              ? "bg-indigo-600 border-indigo-400 text-white"
                              : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-800"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })}
                  {/* Custom Features */}
                  {activeBrief.features
                    .filter((f) => !STANDARD_FEATURES.includes(f))
                    .map((custom) => (
                      <div
                        key={custom}
                        className="p-3 rounded-xl border border-purple-200 dark:border-purple-500/40 bg-purple-100 dark:bg-purple-500/10 text-xs font-medium text-purple-900 dark:text-purple-200 flex items-center justify-between"
                      >
                        <span className="truncate">{custom}</span>
                        <button onClick={() => toggleFeature(custom)} className="text-zinc-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                </div>

                {/* Add Custom Feature */}
                <div className="flex gap-2 max-w-sm pt-2">
                  <input
                    type="text"
                    placeholder="Add custom feature (e.g. 3D configurator)..."
                    value={customFeatureInput}
                    onChange={(e) => setCustomFeatureInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomFeature())}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={addCustomFeature}
                    className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white border border-zinc-200 dark:border-white/5 text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Step 6: Brand Assets & Colors */}
            {step === 6 && (
              <div className="space-y-5">
                <div className="border-b border-zinc-200 dark:border-white/10 pb-3">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Palette className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Brand Identity & Palette
                  </h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    Provide existing brand colors or let BriefCraft research a bespoke 2026 harmonious palette.
                  </p>
                </div>

                {/* Toggle option */}
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      updateActiveBrief({
                        brand: { ...activeBrief.brand, hasExistingBrand: false, suggestBrand: true },
                      })
                    }
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      !activeBrief.brand.hasExistingBrand
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-900 dark:text-white shadow-sm shadow-indigo-500/20"
                        : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/5 dark:bg-zinc-900/60 dark:text-zinc-400"
                    }`}
                  >
                    ✨ No brand yet — Suggest a 2026 palette
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateActiveBrief({
                        brand: { ...activeBrief.brand, hasExistingBrand: true, suggestBrand: false },
                      })
                    }
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      activeBrief.brand.hasExistingBrand
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-900 dark:text-white shadow-sm shadow-indigo-500/20"
                        : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/5 dark:bg-zinc-900/60 dark:text-zinc-400"
                    }`}
                  >
                    🎨 I have existing brand colors
                  </button>
                </div>

                {activeBrief.brand.hasExistingBrand && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Primary Color */}
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 space-y-2">
                        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Primary Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={activeBrief.brand.primaryColor || "#6366f1"}
                            onChange={(e) =>
                              updateActiveBrief({
                                brand: { ...activeBrief.brand, primaryColor: e.target.value },
                              })
                            }
                            className="w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer"
                          />
                          <input
                            type="text"
                            value={activeBrief.brand.primaryColor || "#6366f1"}
                            onChange={(e) =>
                              updateActiveBrief({
                                brand: { ...activeBrief.brand, primaryColor: e.target.value },
                              })
                            }
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white uppercase font-mono"
                          />
                        </div>
                      </div>

                      {/* Secondary Color */}
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 space-y-2">
                        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Secondary / Ambient</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={activeBrief.brand.secondaryColor || "#06b6d4"}
                            onChange={(e) =>
                              updateActiveBrief({
                                brand: { ...activeBrief.brand, secondaryColor: e.target.value },
                              })
                            }
                            className="w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer"
                          />
                          <input
                            type="text"
                            value={activeBrief.brand.secondaryColor || "#06b6d4"}
                            onChange={(e) =>
                              updateActiveBrief({
                                brand: { ...activeBrief.brand, secondaryColor: e.target.value },
                              })
                            }
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white uppercase font-mono"
                          />
                        </div>
                      </div>

                      {/* Accent Color */}
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 space-y-2">
                        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Accent Highlight</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={activeBrief.brand.accentColor || "#f43f5e"}
                            onChange={(e) =>
                              updateActiveBrief({
                                brand: { ...activeBrief.brand, accentColor: e.target.value },
                              })
                            }
                            className="w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer"
                          />
                          <input
                            type="text"
                            value={activeBrief.brand.accentColor || "#f43f5e"}
                            onChange={(e) =>
                              updateActiveBrief({
                                brand: { ...activeBrief.brand, accentColor: e.target.value },
                              })
                            }
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white uppercase font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Brand Identity & Style Notes (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Serif elegance, gold foiling feel, Bauhaus architectural typography..."
                        value={activeBrief.brand.brandNotes || ""}
                        onChange={(e) =>
                          updateActiveBrief({
                            brand: { ...activeBrief.brand, brandNotes: e.target.value },
                          })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 7: Competitors & Timeline Summary */}
            {step === 7 && (
              <div className="space-y-5">
                <div className="border-b border-zinc-200 dark:border-white/10 pb-3">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Inspiration References & Scope Review
                  </h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    Add competitor or inspiration URLs for live context analysis, and review the brief before launching research.
                  </p>
                </div>

                {/* Competitor URLs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Inspiration / Competitor URLs (Up to 3)
                    </label>
                    {(activeBrief.competitorUrls?.length || 0) < 3 && (
                      <button
                        type="button"
                        onClick={addCompetitorField}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                      >
                        + Add URL
                      </button>
                    )}
                  </div>

                  {(activeBrief.competitorUrls || []).length === 0 ? (
                    <button
                      type="button"
                      onClick={addCompetitorField}
                      className="w-full py-2.5 px-3 rounded-xl border border-dashed border-zinc-300 dark:border-white/10 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-400 dark:hover:border-white/20 transition-colors"
                    >
                      + Add an inspiration or competitor site URL
                    </button>
                  ) : (
                    activeBrief.competitorUrls.map((url, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://example.com"
                          value={url}
                          onChange={(e) => updateCompetitorUrl(idx, e.target.value)}
                          className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => removeCompetitorField(idx)}
                          className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Timeline / Scope Note */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Timeline & Scope Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3-week sprint, launch ahead of Q3 funding, MVP launch..."
                    value={activeBrief.timelineNotes || ""}
                    onChange={(e) => updateActiveBrief({ timelineNotes: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                  />
                </div>

                {/* Gemini API Key Selection & Quota Protection */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/10 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="font-bold text-zinc-900 dark:text-white">
                        Gemini API Key
                      </span>
                    </div>
                    {settings.customApiKey ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-500/30">
                        Custom Key Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold">
                        Default Server Key
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Uses default server key. Agar server quota reach ho jaye to aap yahan apni personal Google AI Studio API key daal sakte hain.
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="password"
                      placeholder="Paste your personal Gemini API key (AIzaSy...)"
                      value={customKeyInput}
                      onChange={(e) => setCustomKeyInput(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const cleaned = customKeyInput.trim();
                          updateSettings({ customApiKey: cleaned || undefined });
                          setKeySavedNotice(true);
                          setTimeout(() => setKeySavedNotice(false), 2000);
                        }}
                        className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 whitespace-nowrap"
                      >
                        {keySavedNotice ? "✓ Saved!" : customKeyInput.trim() ? "Use My Key" : "Use Server Key"}
                      </button>
                      {settings.customApiKey && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomKeyInput("");
                            updateSettings({ customApiKey: undefined });
                          }}
                          className="px-2.5 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                          title="Reset to server default key"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 pt-0.5">
                    <span>Keys are kept in your browser&apos;s local storage.</span>
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      Get free key ↗
                    </a>
                  </div>
                </div>

                {/* Summary snapshot card */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 font-semibold border-b border-zinc-200 dark:border-white/5 pb-2">
                    <span>Brief Snapshot Ready for Gemini</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                      {settings.model}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-zinc-700 dark:text-zinc-300">
                    <div>
                      <span className="text-zinc-500">Client:</span> {activeBrief.clientName}
                    </div>
                    <div>
                      <span className="text-zinc-500">Industry:</span> {activeBrief.industry}
                    </div>
                    <div>
                      <span className="text-zinc-500">Goal:</span> {activeBrief.primaryGoal}
                    </div>
                    <div>
                      <span className="text-zinc-500">Pages:</span> {activeBrief.pages.length} selected
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Wizard Navigation Footer */}
        <div className="flex items-center justify-between pt-5 border-t border-zinc-200 dark:border-white/10">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className="min-h-[44px] min-w-[90px] flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-white text-xs font-medium disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 touch-manipulation"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!isStepValid()}
              className="min-h-[44px] min-w-[110px] flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white shadow-md shadow-indigo-500/25 transition-all active:scale-95 touch-manipulation"
            >
              Continue
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={generationState.step !== "idle"}
              className="min-h-[48px] flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:opacity-90 text-xs font-bold text-white shadow-lg shadow-indigo-500/30 transition-all active:scale-95 touch-manipulation"
            >
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
              Launch Live Research & Synthesize Prompt
            </button>
          )}
        </div>
      </div>

      {/* Live Pipeline Running / Quota Wall / Error Modal */}
      {generationState.step !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl glass-panel specular-highlight p-6 border border-zinc-200 dark:border-white/15 text-center space-y-5 shadow-2xl">
            {generationState.isQuotaWall ? (
              // ================= PACIFIC MIDNIGHT QUOTA WALL VIEW =================
              <div className="space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-500/30">
                  <Clock className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">Daily Quota Exhausted Across All Keys</h3>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-100 dark:bg-zinc-900/70 p-3.5 rounded-xl border border-zinc-200 dark:border-white/10 text-left">
                    Today&apos;s free tier quota is completely used up across all 3 fallback models and all configured accounts.
                    <br /><br />
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      Auto-resumes after Pacific midnight:
                    </span>{" "}
                    {generationState.quotaWallResetTime || "Tomorrow"} (in {generationState.quotaWallRemainingFormatted || "a few hours"}).
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-left text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>
                    Your progress has been checkpointed in Firestore. When you return, the pipeline will resume exactly from this step.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setGenerationState({ step: "idle", currentStepNumber: 0, totalSteps: 3, message: "", progressPercent: 0 })}
                    className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium dark:text-zinc-300 transition-colors"
                  >
                    Close & Keep Checkpoint
                  </button>
                  <button
                    onClick={() => handleGenerate()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md transition-all active:scale-95"
                  >
                    Check & Retry
                  </button>
                </div>
              </div>
            ) : generationState.step === "error" ? (
              // ================= GENERAL ERROR MODAL =================
              <div className="space-y-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-500/30">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">Pipeline Execution Notice</h3>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-100 dark:bg-zinc-900/70 p-3 rounded-xl border border-zinc-200 dark:border-white/10 text-left">
                    {generationState.message}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setGenerationState({ step: "idle", currentStepNumber: 0, totalSteps: 3, message: "", progressPercent: 0 })}
                    className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium dark:text-zinc-300 transition-colors"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => handleGenerate()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md transition-all active:scale-95"
                  >
                    Retry Pipeline
                  </button>
                </div>
              </div>
            ) : (
              // ================= LIVE PIPELINE RUNNING VIEW =================
              <>
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/30 animate-pulse">
                  <div className="w-full h-full bg-white dark:bg-zinc-950 rounded-[14px] flex items-center justify-center">
                    {generationState.isWaiting ? (
                      <Hourglass className="w-7 h-7 text-amber-500 animate-spin" />
                    ) : (
                      <Sparkles className="w-7 h-7 text-indigo-600 dark:text-indigo-400 animate-spin" />
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                      BriefCraft Resumable Pipeline
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold">
                      Step {generationState.currentStepNumber || 1} of 3
                    </span>
                  </div>
                  <p className="text-xs text-indigo-600 dark:text-indigo-300 font-medium">{generationState.message}</p>
                </div>

                {/* Proactive RPM Pacing countdown ticker badge */}
                {generationState.isWaiting && (generationState.waitSecondsRemaining || 0) > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 animate-pulse">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>
                      Step {generationState.currentStepNumber || 1} of 3 done — waiting {generationState.waitSecondsRemaining}s before continuing
                    </span>
                  </div>
                )}

                {/* 3-Step Progress Checklist */}
                <div className="space-y-2.5 text-left text-xs bg-zinc-50 dark:bg-zinc-900/70 p-3.5 rounded-xl border border-zinc-200 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          (generationState.currentStepNumber || 1) >= 2
                            ? "bg-emerald-500"
                            : (generationState.currentStepNumber || 1) === 1
                            ? "bg-indigo-500 animate-pulse"
                            : "bg-zinc-300 dark:bg-zinc-600"
                        }`}
                      />
                      <span
                        className={
                          (generationState.currentStepNumber || 1) >= 1
                            ? "text-zinc-900 dark:text-zinc-200 font-medium"
                            : "text-zinc-500"
                        }
                      >
                        Step 1: Creative & Aesthetic Dimensions (1–5)
                      </span>
                    </div>
                    {(generationState.currentStepNumber || 1) >= 2 && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Done ✓</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          (generationState.currentStepNumber || 1) >= 3
                            ? "bg-emerald-500"
                            : (generationState.currentStepNumber || 1) === 2
                            ? "bg-indigo-500 animate-pulse"
                            : "bg-zinc-300 dark:bg-zinc-600"
                        }`}
                      />
                      <span
                        className={
                          (generationState.currentStepNumber || 1) >= 2
                            ? "text-zinc-900 dark:text-zinc-200 font-medium"
                            : "text-zinc-500"
                        }
                      >
                        Step 2: Technical Stack & Industry Benchmarks (6–10)
                      </span>
                    </div>
                    {(generationState.currentStepNumber || 1) >= 3 && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Done ✓</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          generationState.step === "completed"
                            ? "bg-emerald-500"
                            : (generationState.currentStepNumber || 1) === 3
                            ? "bg-indigo-500 animate-pulse"
                            : "bg-zinc-300 dark:bg-zinc-600"
                        }`}
                      />
                      <span
                        className={
                          (generationState.currentStepNumber || 1) >= 3
                            ? "text-zinc-900 dark:text-zinc-200 font-medium"
                            : "text-zinc-500"
                        }
                      >
                        Step 3: Master Build Prompt & Schema Synthesis
                      </span>
                    </div>
                    {generationState.step === "completed" && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Done ✓</span>
                    )}
                  </div>
                </div>

                {/* Visual bar */}
                <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400"
                    initial={{ width: "0%" }}
                    animate={{ width: `${generationState.progressPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                  Proactively spaced per Gemini 3 RPM rate limits. All checkpoints persist automatically.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getStepTitle(step: number): string {
  switch (step) {
    case 1:
      return "Client Overview";
    case 2:
      return "Target Audience & Goals";
    case 3:
      return "Tone & Personality";
    case 4:
      return "Sitemap & Pages";
    case 5:
      return "Interactive Features";
    case 6:
      return "Brand Identity & Colors";
    case 7:
      return "Inspirations & Launch";
    default:
      return "Overview";
  }
}
