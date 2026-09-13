"use client";

import React, { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { useApp } from "@/context/AppContext";
import {
  Sparkles,
  History,
  Settings,
  Sun,
  Moon,
  PlusCircle,
  Code2,
  FileText,
  Compass,
} from "lucide-react";

export function Navbar() {
  const {
    theme,
    toggleTheme,
    activeBrief,
    resetActiveBrief,
    clientsList,
    setIsHistoryOpen,
    setIsSettingsOpen,
    settings,
    currentView,
    setCurrentView,
    currentResult,
  } = useApp();

  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    return scrollY.on("change", (latest) => {
      setIsScrolled(latest > 30);
    });
  }, [scrollY]);

  // Height, background, and border transforms for desktop floating navbar
  const navHeight = useTransform(scrollY, [0, 80], [72, 50]);
  const mobileNavHeight = useTransform(scrollY, [0, 80], [56, 44]);
  const navBg = useTransform(
    scrollY,
    [0, 80],
    theme === "light"
      ? ["rgba(255, 255, 255, 0.88)", "rgba(255, 255, 255, 0.98)"]
      : ["rgba(14, 14, 19, 0.75)", "rgba(14, 14, 19, 0.94)"]
  );
  const navBorder = useTransform(
    scrollY,
    [0, 80],
    theme === "light"
      ? ["rgba(226, 232, 240, 0.85)", "rgba(203, 213, 225, 0.95)"]
      : ["rgba(255, 255, 255, 0.10)", "rgba(255, 255, 255, 0.22)"]
  );

  return (
    <>
      {/* Mobile Fixed Slim Glass Top Bar (md:hidden) */}
      <motion.header
        style={{
          height: mobileNavHeight,
          backgroundColor: navBg,
          borderColor: navBorder,
        }}
        className="fixed top-0 inset-x-0 z-40 md:hidden glass-panel specular-highlight border-b px-4 flex items-center justify-between shadow-sm transition-colors"
      >
        <button
          onClick={resetActiveBrief}
          className="flex items-center gap-2 text-left focus:outline-none min-h-[44px] py-1 active:scale-95 transition-transform"
          aria-label="BriefCraft AI Home"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center text-white shadow-sm shadow-indigo-500/25">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold tracking-tight text-sm text-zinc-900 dark:text-white">
            BriefCraft <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">AI</span>
          </span>
          {activeBrief?.clientName && (
            <span className="text-[10px] text-zinc-500 truncate max-w-[100px] border-l border-zinc-200 dark:border-white/10 pl-2 ml-0.5">
              {activeBrief.clientName}
            </span>
          )}
        </button>

        {/* Minimal Secondary Utility: Theme toggle with minimum 44x44px touch target */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white active:scale-95 transition-all"
            aria-label="Toggle theme"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>
        </div>
      </motion.header>

      {/* Desktop Floating Condensing Glass Top Navbar */}
      <header className="sticky top-0 z-40 w-full px-4 sm:px-6 lg:px-8 pt-3 hidden md:block">
        <motion.nav
          style={{
            height: navHeight,
            backgroundColor: navBg,
            borderColor: navBorder,
          }}
          className="mx-auto max-w-7xl rounded-2xl glass-panel specular-highlight flex items-center justify-between px-6 shadow-lg shadow-black/5 dark:shadow-black/30"
        >
          {/* Brand & Client Indicator */}
          <div className="flex items-center gap-3">
            <button
              onClick={resetActiveBrief}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
              title="BriefCraft AI - Start New Brief"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold tracking-tight text-base sm:text-lg text-zinc-900 dark:text-white">
                  BriefCraft <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">AI</span>
                </span>
                <span className="hidden lg:inline-block ml-2 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
                  2026 Engine
                </span>
              </div>
            </button>

            {/* Active Brief Tag */}
            {activeBrief?.clientName && (
              <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-zinc-200 dark:border-white/10 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate max-w-[160px] font-medium text-zinc-800 dark:text-zinc-200">
                  {activeBrief.clientName}
                </span>
                <span className="text-[10px] text-zinc-500">({activeBrief.industry})</span>
              </div>
            )}
          </div>

          {/* Center Navigation Tabs */}
          <div className="flex items-center gap-1.5 bg-zinc-100/90 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-200 dark:border-white/5">
            <button
              onClick={() => setCurrentView("wizard")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                currentView === "wizard"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-white/5"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Intake Wizard
            </button>
            <button
              onClick={() => {
                if (currentResult) {
                  setCurrentView("results");
                }
              }}
              disabled={!currentResult}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                currentView === "results"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                  : currentResult
                  ? "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-white/5"
                  : "text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-50"
              }`}
              title={!currentResult ? "Generate a prompt first to view results" : ""}
            >
              <Code2 className="w-3.5 h-3.5" />
              Prompt Dashboard
              {currentResult && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              )}
            </button>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* New Brief Button */}
            <button
              onClick={resetActiveBrief}
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm"
              title="Start a new client brief"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              New Brief
            </button>

            {/* History Trigger */}
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="relative flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:hover:bg-zinc-700/60 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200 transition-all"
              title="View past client briefs & prompts"
            >
              <History className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span className="hidden sm:inline">Clients</span>
              {clientsList.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-500/30">
                  {clientsList.length}
                </span>
              )}
            </button>

            {/* Settings Trigger with active model badge */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:hover:bg-zinc-700/60 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200 transition-all"
              title="Model & API Key Settings"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 hidden xl:inline">
                {settings.model === "gemini-3.8-flash" ? "3.8 Flash" : "3.1 Pro"}
              </span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-white/5 transition-colors"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>
          </div>
        </motion.nav>
      </header>

      {/* Mobile Floating iOS 26 Liquid Glass Bottom Dock */}
      <div
        className="fixed inset-x-0 z-40 flex justify-center px-4 md:hidden pointer-events-none"
        style={{
          bottom: "max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))",
        }}
      >
        <nav
          className="pointer-events-auto liquid-glass-dock liquid-glass-dock-chroma specular-highlight flex items-center gap-1.5 p-1.5 rounded-full border border-zinc-200 dark:border-white/15 shadow-xl"
          style={{ contain: "layout paint" }}
        >
          <button
            onClick={() => setCurrentView("wizard")}
            className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] w-12 h-12 rounded-full text-[10px] font-medium transition-all active:scale-90 touch-manipulation ${
              currentView === "wizard"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
            aria-label="Intake Wizard"
          >
            <FileText className="w-4 h-4 mb-0.5" />
            <span>Wizard</span>
          </button>

          <button
            onClick={() => {
              if (currentResult) setCurrentView("results");
            }}
            disabled={!currentResult}
            className={`relative flex flex-col items-center justify-center min-w-[48px] min-h-[48px] w-12 h-12 rounded-full text-[10px] font-medium transition-all active:scale-90 touch-manipulation ${
              currentView === "results"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                : currentResult
                ? "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                : "text-zinc-400 dark:text-zinc-600 opacity-40 cursor-not-allowed"
            }`}
            aria-label="Generated Result"
          >
            <Code2 className="w-4 h-4 mb-0.5" />
            <span>Result</span>
            {currentResult && (
              <span className="absolute top-1 right-3 w-1.5 h-1.5 rounded-full bg-cyan-400" />
            )}
          </button>

          <button
            onClick={resetActiveBrief}
            className="flex flex-col items-center justify-center min-w-[48px] min-h-[48px] w-12 h-12 rounded-full text-[10px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 active:scale-90 transition-all touch-manipulation"
            aria-label="New Client Brief"
          >
            <PlusCircle className="w-4 h-4 mb-0.5 text-indigo-600 dark:text-indigo-400" />
            <span>New</span>
          </button>

          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex flex-col items-center justify-center min-w-[48px] min-h-[48px] w-12 h-12 rounded-full text-[10px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 active:scale-90 transition-all touch-manipulation"
            aria-label="Client Portfolio History"
          >
            <History className="w-4 h-4 mb-0.5" />
            <span>Clients</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex flex-col items-center justify-center min-w-[48px] min-h-[48px] w-12 h-12 rounded-full text-[10px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 active:scale-90 transition-all touch-manipulation"
            aria-label="Configuration Settings"
          >
            <Settings className="w-4 h-4 mb-0.5" />
            <span>Config</span>
          </button>
        </nav>
      </div>
    </>
  );
}
