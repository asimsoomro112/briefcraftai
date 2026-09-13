"use client";

import React from "react";
import { motion } from "motion/react";
import { Sparkles, Compass, ShieldCheck, Zap } from "lucide-react";
import { HeroCanvas } from "./HeroCanvas";

export function HeroHeader() {
  const words = ["Craft", "2026-Grade", "Build", "Prompts", "From", "Live", "Web", "Intelligence."];

  return (
    <div className="relative text-center pt-16 sm:pt-12 pb-6 px-3 sm:px-4 max-w-4xl mx-auto space-y-4">
      {/* Background Ambient Canvas */}
      <HeroCanvas />

      {/* Pill Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/25 text-xs text-indigo-700 dark:text-indigo-300 font-medium shadow-sm max-w-full truncate"
      >
        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse shrink-0" />
        <span className="truncate">Two-Stage Gemini 3.8 Pipeline + Live Google Search Grounding</span>
      </motion.div>

      {/* Kinetic Headline with 360px fluid scale */}
      <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-zinc-900 dark:text-white leading-[1.15] break-words flex flex-wrap justify-center gap-x-2 sm:gap-x-3 gap-y-1">
        {words.map((word, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.28,
              delay: i * 0.04,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={
              word.includes("2026-Grade") || word.includes("Intelligence")
                ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 dark:from-indigo-400 dark:via-purple-300 dark:to-cyan-400 bg-clip-text text-transparent"
                : ""
            }
          >
            {word}
          </motion.span>
        ))}
      </h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.35 }}
        className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed"
      >
        Transform raw client notes into senior-designer-grade, copy-paste-ready build prompts for{" "}
        <span className="text-zinc-900 dark:text-zinc-200 font-semibold">Google AI Studio Build Mode</span> and{" "}
        <span className="text-zinc-900 dark:text-zinc-200 font-semibold">Antigravity</span>.
      </motion.p>

      {/* Quick Value Metrics */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.45 }}
        className="pt-2 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-zinc-600 dark:text-zinc-400"
      >
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>10 2026 Design Dimensions</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Lenis, Variable Fonts & Shaders</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Prefers-Reduced-Motion Safe</span>
        </div>
      </motion.div>
    </div>
  );
}
