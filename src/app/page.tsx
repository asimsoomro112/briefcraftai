"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { HeroHeader } from "@/components/home/HeroHeader";
import { IntakeWizard } from "@/components/wizard/IntakeWizard";
import { ResultsDashboard } from "@/components/results/ResultsDashboard";
import { AtelierProcessShowcase } from "@/components/home/AtelierProcessShowcase";

export default function Home() {
  const { currentView } = useApp();

  return (
    <div className="w-full space-y-8">
      {currentView === "wizard" ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          <HeroHeader />
          <IntakeWizard />
        </div>
      ) : (
        <div className="animate-in fade-in duration-200">
          <ResultsDashboard />
        </div>
      )}

      {/* 2026 Mobile & Touch Adaptation Benchmark Section */}
      <AtelierProcessShowcase />
    </div>
  );
}
