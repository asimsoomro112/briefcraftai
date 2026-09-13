export type SiteGoal = 'leads' | 'sales' | 'portfolio' | 'booking' | 'informational';

export type ToneChip = 'Luxury' | 'Minimal' | 'Playful' | 'Corporate' | 'Bold' | 'Editorial' | string;

export interface BrandAssets {
  hasExistingBrand: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  brandNotes?: string;
  suggestBrand?: boolean;
}

export interface ClientBrief {
  id: string;
  clientName: string;
  industry: string;
  description: string;
  targetAudience: string;
  primaryGoal: SiteGoal;
  tones: string[];
  pages: string[];
  features: string[];
  brand: BrandAssets;
  competitorUrls: string[];
  timelineNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroundingCitation {
  title?: string;
  url: string;
  snippet?: string;
}

export interface ResearchNotes {
  summary: string;
  trendFit: string;
  scrollMotionAdvice: string;
  heroConceptAdvice: string;
  backgroundAdvice: string;
  typographyAdvice: string;
  navTransitionsAdvice: string;
  microInteractionsAdvice: string;
  stackRecommendations: string;
  competitorAnalysis?: string;
  awwwardsTrends?: string;
  citations: GroundingCitation[];
  searchQueriesUsed: string[];
  isLiveResearched: boolean;
  isFallbackUsed?: boolean;
  fallbackModelUsed?: string;
}

export interface GeneratedPromptData {
  id: string;
  clientId: string;
  modelUsed: 'gemini-3.8-flash' | 'gemini-3.1-pro-preview';
  createdAt: string;
  finalPrompt: string;
  stackChoices: string[];
  designDirection: string[];
  heroConcept: string;
  motionAndScrollPlan: string;
  typographySystem: string;
  keySections: string[];
  sourcesUsed: string[];
  researchNotes: ResearchNotes;
  assetStrategy?: string;
}

export interface GenerationStepState {
  step: 'idle' | 'stageA_research' | 'stageA_competitors' | 'stageB_synthesis' | 'persisting' | 'completed' | 'error';
  message: string;
  progressPercent: number;
}

export interface AppSettings {
  model: 'gemini-3.8-flash' | 'gemini-3.1-pro-preview';
  customApiKey?: string;
  enableThinking: boolean;
}
