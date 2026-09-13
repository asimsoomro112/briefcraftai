"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  ClientBrief,
  GeneratedPromptData,
  GenerationStepState,
  AppSettings,
} from "@/types";
import {
  getAllClients,
  getLatestPromptForClient,
  saveClientBrief,
  saveGeneratedPrompt,
} from "@/lib/firestore";

interface AppContextType {
  theme: "dark" | "light";
  toggleTheme: () => void;
  activeBrief: ClientBrief;
  updateActiveBrief: (updates: Partial<ClientBrief>) => void;
  resetActiveBrief: () => void;
  loadBriefAndPrompt: (clientId: string) => Promise<void>;
  currentResult: GeneratedPromptData | null;
  setCurrentResult: (result: GeneratedPromptData | null) => void;
  generationState: GenerationStepState;
  setGenerationState: React.Dispatch<React.SetStateAction<GenerationStepState>>;
  clientsList: ClientBrief[];
  refreshClientsList: () => Promise<void>;
  isHistoryOpen: boolean;
  setIsHistoryOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isRegenerateOpen: boolean;
  setIsRegenerateOpen: (open: boolean) => void;
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  currentView: "wizard" | "results";
  setCurrentView: (view: "wizard" | "results") => void;
}

const defaultBrief: ClientBrief = {
  id: "",
  clientName: "",
  industry: "",
  description: "",
  targetAudience: "",
  primaryGoal: "leads",
  tones: ["Minimal", "Editorial"],
  pages: ["Home", "About", "Services", "Contact"],
  features: ["contact form", "animations", "newsletter signup"],
  brand: {
    hasExistingBrand: false,
    suggestBrand: true,
    primaryColor: "#6366f1",
    secondaryColor: "#06b6d4",
    accentColor: "#f43f5e",
  },
  competitorUrls: [],
  timelineNotes: "",
  createdAt: "",
  updatedAt: "",
};

const defaultSettings: AppSettings = {
  model: "gemini-3.8-flash",
  enableThinking: true,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activeBrief, setActiveBrief] = useState<ClientBrief>(() => ({
    ...defaultBrief,
    id: `client_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  const [currentResult, setCurrentResult] = useState<GeneratedPromptData | null>(null);
  const [generationState, setGenerationState] = useState<GenerationStepState>({
    step: "idle",
    message: "",
    progressPercent: 0,
  });
  const [clientsList, setClientsList] = useState<ClientBrief[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRegenerateOpen, setIsRegenerateOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [currentView, setCurrentView] = useState<"wizard" | "results">("wizard");

  // Load saved settings & client list on mount
  useEffect(() => {
    // Initialize Firebase Analytics on browser mount
    import("@/lib/firebase").then(({ getFirebaseAnalytics }) => {
      getFirebaseAnalytics();
    });

    try {
      const savedSettings = localStorage.getItem("briefcraft_settings_v1");
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
      const savedTheme = localStorage.getItem("briefcraft_theme_v1") as "dark" | "light";
      if (savedTheme) {
        setTheme(savedTheme);
      }
    } catch (e) {
      console.warn("Storage read error:", e);
    }
    refreshClientsList();
  }, []);

  // Sync theme class to document body
  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (theme === "light") {
        root.classList.add("light");
        root.classList.remove("dark");
      } else {
        root.classList.add("dark");
        root.classList.remove("light");
      }
      localStorage.setItem("briefcraft_theme_v1", theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const updateActiveBrief = (updates: Partial<ClientBrief>) => {
    setActiveBrief((prev) => ({
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  };

  const resetActiveBrief = () => {
    const newBrief: ClientBrief = {
      ...defaultBrief,
      id: `client_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setActiveBrief(newBrief);
    setCurrentResult(null);
    setCurrentView("wizard");
  };

  const refreshClientsList = async () => {
    const list = await getAllClients();
    setClientsList(list);
  };

  const loadBriefAndPrompt = async (clientId: string) => {
    const client = clientsList.find((c) => c.id === clientId);
    if (client) {
      setActiveBrief(client);
      const prompt = await getLatestPromptForClient(clientId);
      if (prompt) {
        setCurrentResult(prompt);
        setCurrentView("results");
      } else {
        setCurrentView("wizard");
      }
      setIsHistoryOpen(false);
    }
  };

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem("briefcraft_settings_v1", JSON.stringify(next));
      return next;
    });
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        activeBrief,
        updateActiveBrief,
        resetActiveBrief,
        loadBriefAndPrompt,
        currentResult,
        setCurrentResult,
        generationState,
        setGenerationState,
        clientsList,
        refreshClientsList,
        isHistoryOpen,
        setIsHistoryOpen,
        isSettingsOpen,
        setIsSettingsOpen,
        isRegenerateOpen,
        setIsRegenerateOpen,
        settings,
        updateSettings,
        currentView,
        setCurrentView,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
