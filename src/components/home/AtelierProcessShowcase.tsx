"use client";

import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { Gem, Compass, Hammer, Sparkles, Check, ArrowRight, Eye, ShieldCheck } from "lucide-react";

export function AtelierProcessShowcase() {
  // Mobile tap-to-reveal state for 3D Gemstone Card
  const [isCardInspected, setIsCardInspected] = useState(false);
  // Magnetic button state for desktop cursor attraction
  const [buttonOffset, setButtonOffset] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Desktop card tilt state
  const [cardTilt, setCardTilt] = useState({ x: 0, y: 0 });

  const steps = [
    {
      num: "01",
      name: "Sourcing",
      icon: Gem,
      desc: "Ethically mined untreated gemstones & traceable certified recycled platinum.",
      meta: "Conflict-Free Origin",
    },
    {
      num: "02",
      name: "Sketching",
      icon: Compass,
      desc: "Hand-drawn gouache renderings & bespoke structural proportion architecture.",
      meta: "1:1 Scale Drafting",
    },
    {
      num: "03",
      name: "Forging",
      icon: Hammer,
      desc: "Master goldsmith alloying & hand-fabricated cold-hammered bezel mounts.",
      meta: "Traditional Metallurgy",
    },
    {
      num: "04",
      name: "Setting",
      icon: Sparkles,
      desc: "Micro-pavé optical setting under 40x surgical magnification lenses.",
      meta: "Precision Optical Fit",
    },
  ];

  // Desktop magnetic button handler
  const handleMouseMoveButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (typeof window !== "undefined" && window.innerWidth < 768) return; // Disabled on touch
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distanceX = (e.clientX - centerX) * 0.25;
    const distanceY = (e.clientY - centerY) * 0.25;
    setButtonOffset({ x: distanceX, y: distanceY });
  };

  const handleMouseLeaveButton = () => {
    setButtonOffset({ x: 0, y: 0 });
  };

  // Desktop 3D card tilt handler
  const handleMouseMoveCard = (e: React.MouseEvent<HTMLDivElement>) => {
    if (typeof window !== "undefined" && window.innerWidth < 768) return; // Disabled on touch
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -10;
    const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 10;
    setCardTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeaveCard = () => {
    setCardTilt({ x: 0, y: 0 });
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-zinc-200 dark:border-white/10 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-[10px] font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider mb-1.5">
            2026 Mobile & Touch Adaptation Benchmark
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Atelier Process & Tactile Showcase
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            Demonstrating desktop horizontal-pinned to mobile vertical-stepped conversion, touch tap feedback, and 3D card inspect.
          </p>
        </div>

        <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline-block">
          Sourcing → Sketching → Forging → Setting
        </span>
      </div>

      {/* 1. Desktop vs Mobile Atelier Process Timeline */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
          <span>Atelier Process Timeline</span>
          <span className="text-[10px] lowercase font-normal text-zinc-500">
            (Desktop horizontal pinned / Mobile vertical stepped)
          </span>
        </h3>

        {/* DESKTOP TIMELINE (Horizontal 4-column flow, hidden on mobile) */}
        <div className="hidden md:grid md:grid-cols-4 gap-4 relative">
          <div className="absolute top-7 left-12 right-12 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 opacity-30 -z-0" />
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.08 }}
                className="bento-card p-5 specular-highlight relative z-10 space-y-3 hover:border-indigo-500/40 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/25 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs font-bold text-zinc-400 dark:text-zinc-600">
                    {step.num}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {step.name}
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
                <div className="pt-2 border-t border-zinc-200 dark:border-white/5 text-[10px] font-mono text-zinc-500">
                  {step.meta}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* MOBILE TIMELINE: VERTICAL STEPPED LAYOUT (Zero horizontal scroll-jacking, strictly vertical on mobile) */}
        <div className="flex flex-col md:hidden space-y-3 relative pl-6 border-l-2 border-indigo-500/30 dark:border-indigo-500/20 ml-3">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ duration: 0.25, delay: idx * 0.06 }}
                className="bento-card p-4 relative space-y-2"
              >
                {/* Connecting step bullet */}
                <div className="absolute -left-[31px] top-4 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shadow-md shadow-indigo-500/30">
                  {idx + 1}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/25">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                      {step.name}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {step.meta}
                  </span>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed pl-9">
                  {step.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 2. Touch-Adapted 3D Gemstone Card & Mobile Tap-Feedback Magnetic Button */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        {/* 3D Gemstone Card Tilt (Desktop Cursor Tilt / Mobile Tap-to-Inspect) */}
        <div className="bento-card p-6 specular-highlight space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
              <Gem className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>3D Gemstone Card Interaction</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              Desktop: Tilt • Mobile: Tap-Inspect
            </span>
          </div>

          <div
            onMouseMove={handleMouseMoveCard}
            onMouseLeave={handleMouseLeaveCard}
            onClick={() => setIsCardInspected(!isCardInspected)}
            style={{
              transform: `perspective(800px) rotateX(${cardTilt.x}deg) rotateY(${cardTilt.y}deg)`,
              transition: "transform 0.15s ease-out",
            }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer select-none relative overflow-hidden ${
              isCardInspected
                ? "border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20"
                : "border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/80 hover:border-cyan-500/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold">
                  Bespoke Cut Specimen
                </span>
                <h4 className="text-base font-black text-zinc-900 dark:text-white mt-0.5">
                  5.42ct Ceylon Royal Sapphire
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Unheated cushion-cut with velvet cornflower hue. Set in hand-forged 950 platinum.
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-cyan-500/20">
                <Gem className="w-6 h-6" />
              </div>
            </div>

            {/* Mobile Touch Indicator */}
            <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-white/5 flex items-center justify-between text-xs">
              <span className="text-zinc-500 text-[11px]">
                {isCardInspected ? "Micro-facets inspected ✓" : "Tap to inspect facets"}
              </span>
              <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-semibold text-[11px]">
                <Eye className="w-3.5 h-3.5" />
                {isCardInspected ? "Inspecting" : "Tap Inspect"}
              </span>
            </div>
          </div>
        </div>

        {/* Magnetic Button (Desktop Proximity Attraction / Mobile Touch Scale Feedback) */}
        <div className="bento-card p-6 specular-highlight space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Magnetic Touch Button</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                44×44px Min Touch Target
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed pt-1">
              On desktop, tracks cursor proximity with magnetic attraction. On mobile, translates to instant tactile tap-feedback scale and opacity.
            </p>
          </div>

          <div className="pt-4 flex flex-wrap items-center gap-3">
            <button
              ref={buttonRef}
              onMouseMove={handleMouseMoveButton}
              onMouseLeave={handleMouseLeaveButton}
              style={{
                transform: `translate(${buttonOffset.x}px, ${buttonOffset.y}px)`,
                transition: "transform 0.12s ease-out",
              }}
              className="min-h-[48px] px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center gap-2 active:scale-95 active:opacity-90 transition-all touch-manipulation focus:outline-none"
              aria-label="Commission Bespoke Piece"
            >
              <span>Commission Bespoke Piece</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Touch-manipulation safe
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
