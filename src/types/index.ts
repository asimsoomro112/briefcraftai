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
  dimensionsBatch1?: Record<string, string>;
  dimensionsBatch2?: Record<string, string>;
}

export type GeminiModelId = 'gemini-3.1-flash-lite' | 'gemini-3.5-flash-lite' | 'gemini-3.7-flash';

export type PipelineStepId = 'research-dimension-batch-1' | 'research-dimension-batch-2' | 'synthesis';

export interface PipelineStepOutput {
  stepId: PipelineStepId;
  completedAt: string;
  data: unknown;
  modelUsed: string;
  keyIndexUsed?: number;
}

export interface PipelineJobState {
  briefId: string;
  clientId: string;
  status: 'pending' | 'running' | 'paused_ratelimit' | 'paused_quota_wall' | 'completed' | 'error';
  currentStep: PipelineStepId;
  currentStepIndex: number;
  totalSteps: number;
  stepOutputs: {
    'research-dimension-batch-1'?: PipelineStepOutput;
    'research-dimension-batch-2'?: PipelineStepOutput;
    'synthesis'?: PipelineStepOutput;
  };
  pauseReason?: string;
  resumeAt?: string;
  waitSecondsRemaining?: number;
  quotaWallResetPacific?: string;
  quotaWallRemainingFormatted?: string;
  errorMessage?: string;
  updatedAt: string;
  createdAt: string;
}

export interface GeneratedPromptData {
  id: string;
  clientId: string;
  modelUsed: GeminiModelId | string;
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
  keyRotationUsed?: boolean;
  keyIndexUsed?: number;
}

export interface GenerationStepState {
  step: 'idle' | 'running' | 'stageA_research' | 'stageA_competitors' | 'stageB_synthesis' | 'persisting' | 'completed' | 'error';
  currentStepId?: PipelineStepId;
  currentStepNumber?: number;
  totalSteps?: number;
  message: string;
  progressPercent: number;
  isWaiting?: boolean;
  waitSecondsRemaining?: number;
  isQuotaWall?: boolean;
  quotaWallResetTime?: string;
  quotaWallRemainingFormatted?: string;
  activeModel?: string;
  activeKeyMask?: string;
}

export interface AppSettings {
  model: GeminiModelId;
  customApiKey?: string;
  enableThinking: boolean;
}
