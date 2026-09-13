import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { Navbar } from "@/components/layout/Navbar";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { HistoryDrawer } from "@/components/history/HistoryDrawer";
import { SvgFilters } from "@/components/layout/SvgFilters";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "BriefCraft AI — 2026 Autonomous Build Prompt Architect",
  description:
    "Internal AI tool for freelance web developers. Autonomously researches the 2026 design/tech landscape for client briefs using live web search and outputs copy-paste-ready build prompts for Google AI Studio Build mode and Antigravity.",
  keywords: [
    "BriefCraft AI",
    "Prompt Engineer WebApp",
    "AI Studio Build Mode",
    "Antigravity",
    "Web Developer Tool",
    "Gemini 3.8 Flash",
    "Search Grounding",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col transition-colors duration-200 selection:bg-indigo-500/30 selection:text-white">
        <SvgFilters />
        <AppProvider>
          <div className="relative min-h-[100dvh] flex flex-col pb-24 md:pb-12">
            <Navbar />
            <main className="flex-1 w-full">{children}</main>
            <footer className="w-full py-6 px-4 text-center text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-200 dark:border-white/5 mt-12 hidden md:block">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
                <span>
                  BriefCraft AI © 2026 • Engine powered by Google Gemini 3.8 Flash & Search Grounding
                </span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  Tailored for Google AI Studio Build Mode & Antigravity Coding Agents
                </span>
              </div>
            </footer>
          </div>
          <SettingsModal />
          <HistoryDrawer />
        </AppProvider>
      </body>
    </html>
  );
}
