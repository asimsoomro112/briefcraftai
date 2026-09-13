import { GoogleGenAI } from "@google/genai";
import {
  ClientBrief,
  GeneratedPromptData,
  GroundingCitation,
  ResearchNotes,
  GeminiModelId,
  PipelineStepId,
} from "@/types";
import {
  executeGeminiWithScheduler,
  SchedulerProgressUpdate,
} from "./gemini-scheduler";

export interface PipelineProgressCallback {
  (update: {
    stepId: PipelineStepId;
    stepNumber: number; // 1, 2, 3
    totalSteps: number; // 3
    message: string;
    isWaiting?: boolean;
    waitSecondsRemaining?: number;
    modelUsed?: string;
    keyMask?: string;
    isFallbackModel?: boolean;
    isKeyRotated?: boolean;
    progressPercent?: number;
  }): void;
}

export interface PipelineExecutionOptions {
  customApiKey?: string;
  preferredModel?: GeminiModelId;
  onProgress?: PipelineProgressCallback;
}

// =========================================================================
// STEP 1: RESEARCH BATCH 1 (Dimensions 1–5: Creative, Aesthetic & Motion)
// =========================================================================

export interface ResearchBatch1Result {
  summary: string;
  trendFit: string;
  scrollMotionAdvice: string;
  heroConceptAdvice: string;
  backgroundAdvice: string;
  typographyAdvice: string;
  citations: GroundingCitation[];
  searchQueriesUsed: string[];
  modelUsed: GeminiModelId;
  keyMaskUsed: string;
  keyIndexUsed: number;
  isFallbackModelUsed: boolean;
  isKeyRotated: boolean;
}

export async function runResearchBatch1(
  brief: ClientBrief,
  options: PipelineExecutionOptions = {}
): Promise<ResearchBatch1Result> {
  const stepId: PipelineStepId = "research-dimension-batch-1";

  if (options.onProgress) {
    options.onProgress({
      stepId,
      stepNumber: 1,
      totalSteps: 3,
      message: `Step 1/3: Researching creative & aesthetic dimensions for ${brief.industry}...`,
      progressPercent: 15,
    });
  }

  const prompt = `
You are an elite 2026 principal creative technologist and web design director.
Perform autonomous web design research for a client project.

CLIENT PROFILE:
- Business: ${brief.clientName}
- Industry: ${brief.industry}
- Overview: ${brief.description}
- Target Audience: ${brief.targetAudience}
- Primary Goal: ${brief.primaryGoal}
- Tone: ${brief.tones.join(", ")}
- Brand Assets: ${
    brief.brand.hasExistingBrand
      ? `Primary: ${brief.brand.primaryColor}, Secondary: ${brief.brand.secondaryColor}, Accent: ${brief.brand.accentColor}. Notes: ${brief.brand.brandNotes || "None"}`
      : "No existing brand; recommend a bespoke 2026 color palette."
  }

TASK - RESEARCH DIMENSIONS 1 THROUGH 5:
Provide specific, named creative techniques tailored to this industry (${brief.industry}) and tone (${brief.tones.join(", ")}):
1. Overall trend fit: Current award-winning web design trends appropriate for this industry and tone.
2. Scroll & motion behavior: Precise scroll physics (Lenis momentum scroll vs GSAP ScrollTrigger vs native CSS animation-timeline: view()).
3. Hero section concept: Specific hero treatment (oversized kinetic typography vs media-led vs generative shader mesh background).
4. Background treatment: Animated WebGL/mesh gradient vs subtle grain/procedural texture vs static CSS, including prefers-reduced-motion fallback.
5. Typography system: Specific Google font pairing (display face + body face), fluid clamp() type scale, and kinetic/gradient typography.

Return clear markdown with dedicated headers for each of the 5 dimensions.
`;

  const schedulerCallback = (update: SchedulerProgressUpdate) => {
    if (options.onProgress) {
      options.onProgress({
        stepId,
        stepNumber: 1,
        totalSteps: 3,
        message: update.message,
        isWaiting: update.isWaiting,
        waitSecondsRemaining: update.waitSecondsRemaining,
        modelUsed: update.modelUsed,
        keyMask: update.keyMask,
        isFallbackModel: update.isFallbackModel,
        isKeyRotated: update.isKeyRotated,
        progressPercent: 25,
      });
    }
  };

  // Attempt with Google Search Grounding first, fall back to pure model reasoning
  const execution = await executeGeminiWithScheduler(
    async (ai: GoogleGenAI, modelId: GeminiModelId) => {
      try {
        return await ai.models.generateContent({
          model: modelId,
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
      } catch {
        console.warn(`[Batch 1] Grounding unavailable on ${modelId}, continuing with native model knowledge.`);
        return await ai.models.generateContent({
          model: modelId,
          contents: prompt,
        });
      }
    },
    {
      customApiKey: options.customApiKey,
      preferredModel: options.preferredModel || "gemini-3.1-flash-lite",
      onProgress: schedulerCallback,
    }
  );

  const text = execution.response.text || "";
  const candidate = execution.response.candidates?.[0];
  const groundingMeta = candidate?.groundingMetadata;

  const citations: GroundingCitation[] = [];
  if (groundingMeta?.groundingChunks) {
    for (const chunk of groundingMeta.groundingChunks) {
      if (chunk.web?.uri) {
        citations.push({
          url: chunk.web.uri,
          title: chunk.web.title || new URL(chunk.web.uri).hostname,
        });
      }
    }
  }

  const searchQueries = groundingMeta?.webSearchQueries || [];

  return {
    summary: text.slice(0, 450) + (text.length > 450 ? "..." : ""),
    trendFit: extractSection(text, "trend", "Contemporary minimalist obsidian bento architecture tailored to the sector."),
    scrollMotionAdvice: extractSection(text, "scroll", "Lenis smooth momentum scrolling paired with native scroll-driven animations for 60fps performance."),
    heroConceptAdvice: extractSection(text, "hero", "Oversized kinetic split-text headline with soft ambient shader gradient glow and mobile 30fps throttle."),
    backgroundAdvice: extractSection(text, "background", "Subtle animated WebGL mesh gradient behind hero, falling back to static CSS gradients on prefers-reduced-motion."),
    typographyAdvice: extractSection(text, "typography", "Display: Syne or Cabinet Grotesk; Body: Plus Jakarta Sans with fluid CSS clamp() scaling."),
    citations,
    searchQueriesUsed: searchQueries,
    modelUsed: execution.modelUsed,
    keyMaskUsed: execution.keyMaskUsed,
    keyIndexUsed: execution.keyIndexUsed,
    isFallbackModelUsed: execution.isFallbackModelUsed,
    isKeyRotated: execution.isKeyRotated,
  };
}

// =========================================================================
// STEP 2: RESEARCH BATCH 2 (Dimensions 6–10: Technical, Interactive & Benchmarks)
// =========================================================================

export async function runResearchBatch2(
  brief: ClientBrief,
  batch1: ResearchBatch1Result,
  options: PipelineExecutionOptions = {}
): Promise<ResearchNotes> {
  const stepId: PipelineStepId = "research-dimension-batch-2";

  if (options.onProgress) {
    options.onProgress({
      stepId,
      stepNumber: 2,
      totalSteps: 3,
      message: `Step 2/3: Researching technical stack, micro-interactions & industry benchmarks...`,
      progressPercent: 45,
    });
  }

  const prompt = `
You are an elite 2026 principal creative technologist and web design director.
Continue the client research by evaluating dimensions 6 through 10.

CLIENT PROFILE:
- Business: ${brief.clientName}
- Industry: ${brief.industry}
- Pages: ${brief.pages.join(", ")}
- Features: ${brief.features.join(", ")}
- Competitors: ${brief.competitorUrls.length > 0 ? brief.competitorUrls.join(", ") : "None specified"}

CREATIVE DIRECTION ESTABLISHED IN STEP 1:
- Trend Fit: ${batch1.trendFit}
- Hero Concept: ${batch1.heroConceptAdvice}
- Motion Plan: ${batch1.scrollMotionAdvice}
- Typography: ${batch1.typographyAdvice}

TASK - RESEARCH DIMENSIONS 6 THROUGH 10:
6. Navigation & page transitions: Desktop floating glass top navbar (condensing on scroll) and mobile liquid glass bottom dock.
7. Micro-interactions: Magnetic cursor buttons, 3D card perspective tilt, focus glow states, and mobile touch equivalents.
8. Recommended frontend stack/libraries: Next.js 16 (App Router), React 19, Tailwind CSS v4, Motion (must import from 'motion/react'), Lenis (must specify 'npm install lenis' and import from 'lenis' or 'lenis/react'; NEVER use deprecated @studio-freight packages).
9. Competitor / Inspiration analysis: Analyze competitor patterns to borrow or avoid.
10. Awwwards / Land-book / Godly trends: Awarded 2026 design benchmarks in this category.

Provide concise, definitive recommendations with clear section headings.
`;

  const schedulerCallback = (update: SchedulerProgressUpdate) => {
    if (options.onProgress) {
      options.onProgress({
        stepId,
        stepNumber: 2,
        totalSteps: 3,
        message: update.message,
        isWaiting: update.isWaiting,
        waitSecondsRemaining: update.waitSecondsRemaining,
        modelUsed: update.modelUsed,
        keyMask: update.keyMask,
        isFallbackModel: update.isFallbackModel,
        isKeyRotated: update.isKeyRotated,
        progressPercent: 55,
      });
    }
  };

  const execution = await executeGeminiWithScheduler(
    async (ai: GoogleGenAI, modelId: GeminiModelId) => {
      try {
        return await ai.models.generateContent({
          model: modelId,
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
      } catch {
        return await ai.models.generateContent({
          model: modelId,
          contents: prompt,
        });
      }
    },
    {
      customApiKey: options.customApiKey,
      preferredModel: options.preferredModel || "gemini-3.1-flash-lite",
      onProgress: schedulerCallback,
    }
  );

  const text = execution.response.text || "";
  const candidate = execution.response.candidates?.[0];
  const groundingMeta = candidate?.groundingMetadata;

  const citations: GroundingCitation[] = [...batch1.citations];
  if (groundingMeta?.groundingChunks) {
    for (const chunk of groundingMeta.groundingChunks) {
      if (chunk.web?.uri) {
        citations.push({
          url: chunk.web.uri,
          title: chunk.web.title || new URL(chunk.web.uri).hostname,
        });
      }
    }
  }

  const searchQueries = [
    ...batch1.searchQueriesUsed,
    ...(groundingMeta?.webSearchQueries || []),
  ];

  const fullResearchNotes: ResearchNotes = {
    summary: `${batch1.summary}\n\nTechnical Architecture: ${text.slice(0, 300)}...`,
    trendFit: batch1.trendFit,
    scrollMotionAdvice: batch1.scrollMotionAdvice,
    heroConceptAdvice: batch1.heroConceptAdvice,
    backgroundAdvice: batch1.backgroundAdvice,
    typographyAdvice: batch1.typographyAdvice,
    navTransitionsAdvice: extractSection(text, "nav", "Floating glass top navbar condensing 72px to 48px on desktop, floating iOS liquid glass bottom dock on mobile."),
    microInteractionsAdvice: extractSection(text, "micro", "Magnetic cursor attraction buttons, 3D card perspective tilt on hover, and touch-scale feedback on mobile."),
    stackRecommendations: extractSection(text, "stack", "Next.js 16 (App Router), React 19, Tailwind CSS v4, Motion (motion/react), Lenis, Lucide Icons."),
    competitorAnalysis: extractSection(text, "competitor", "Emphasizes fast load times, clear CTA hierarchy, and bento modules."),
    awwwardsTrends: extractSection(text, "awwward", "Finalists favor restrained glassmorphism, variable font animation, and tactile haptic cues."),
    citations,
    searchQueriesUsed: searchQueries,
    isLiveResearched: citations.length > 0,
    isFallbackUsed: batch1.isFallbackModelUsed || execution.isFallbackModelUsed,
    fallbackModelUsed: execution.isFallbackModelUsed ? execution.modelUsed : undefined,
  };

  return fullResearchNotes;
}

// =========================================================================
// STEP 3: SYNTHESIS (Stage B: Structured Master Build Prompt)
// =========================================================================

export async function runSynthesis(
  brief: ClientBrief,
  research: ResearchNotes,
  options: PipelineExecutionOptions = {}
): Promise<Omit<GeneratedPromptData, "id" | "clientId" | "createdAt">> {
  const stepId: PipelineStepId = "synthesis";

  if (options.onProgress) {
    options.onProgress({
      stepId,
      stepNumber: 3,
      totalSteps: 3,
      message: `Step 3/3: Synthesizing master build prompt with structured output...`,
      progressPercent: 75,
    });
  }

  const prompt = `
You are an expert senior prompt engineer and creative technologist.
Synthesize the client brief and the 2026 design/tech research findings into ONE master, production-grade "Build Prompt".
This build prompt will be fed directly into an AI coding agent to generate the client's actual website with no further editing needed.

CLIENT BRIEF:
- Client / Business Name: ${brief.clientName}
- Industry: ${brief.industry}
- Summary: ${brief.description}
- Target Audience: ${brief.targetAudience}
- Primary Goal: ${brief.primaryGoal}
- Tones: ${brief.tones.join(", ")}
- Pages Needed: ${brief.pages.join(", ")}
- Must-Have Features: ${brief.features.join(", ")}
- Brand Assets: ${
    brief.brand.hasExistingBrand
      ? `Primary: ${brief.brand.primaryColor}, Secondary: ${brief.brand.secondaryColor}, Accent: ${brief.brand.accentColor}`
      : "No existing brand; generate a bespoke 2026 palette."
  }
- Timeline / Scope: ${brief.timelineNotes || "Standard production"}

RESEARCH FINDINGS:
${research.summary}
- Trend Fit: ${research.trendFit}
- Scroll & Motion: ${research.scrollMotionAdvice}
- Hero Concept: ${research.heroConceptAdvice}
- Background Treatment: ${research.backgroundAdvice}
- Typography: ${research.typographyAdvice}
- Nav & Page Transitions: ${research.navTransitionsAdvice}
- Micro-interactions: ${research.microInteractionsAdvice}
- Stack: ${research.stackRecommendations}
- Industry Benchmarks: ${research.awwwardsTrends || "Award-winning references"}

REQUIREMENTS FOR finalPrompt:
The finalPrompt MUST be a single, complete, copy-paste-ready build prompt formatted in clean Markdown.
It must cover all 12 mandatory areas:
1. Project overview, target audience & tone
2. Sitemap & information architecture
3. Full design system (Hex codes, named Google Fonts display + body pairing, fluid clamp scale)
4. Specific hero section concept chosen
5. Specific scroll/motion plan (Lenis vs GSAP vs CSS animation-timeline)
6. Named micro-interactions per key component (buttons, cards, forms)
7. Exact tech stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Motion ('motion/react'), Lenis ('lenis'), Lucide Icons
8. Component/section list with interactive functionality
9. Content/copy guidance per section
10. SEO + accessibility (prefers-reduced-motion fallback plan) + WCAG AA
11. Responsive requirements:
    (a) Mobile persistent brand identity top bar (~56px condensing to ~44px) in addition to bottom dock
    (b) Touch-appropriate mobile equivalents for all hover/tilt interactions
12. Asset strategy for placeholders (stylized generated imagery, CSS/WebGL primitives flagged for substitution)

OUTPUT FORMAT:
Return a valid JSON object matching this schema:
{
  "finalPrompt": "string — the complete, ready-to-paste build prompt formatted in markdown covering all 12 areas",
  "stackChoices": ["string"],
  "designDirection": ["string"],
  "heroConcept": "string",
  "motionAndScrollPlan": "string",
  "typographySystem": "string",
  "keySections": ["string"],
  "sourcesUsed": ["string"],
  "assetStrategy": "string"
}
`;

  const schedulerCallback = (update: SchedulerProgressUpdate) => {
    if (options.onProgress) {
      options.onProgress({
        stepId,
        stepNumber: 3,
        totalSteps: 3,
        message: update.message,
        isWaiting: update.isWaiting,
        waitSecondsRemaining: update.waitSecondsRemaining,
        modelUsed: update.modelUsed,
        keyMask: update.keyMask,
        isFallbackModel: update.isFallbackModel,
        isKeyRotated: update.isKeyRotated,
        progressPercent: 85,
      });
    }
  };

  const execution = await executeGeminiWithScheduler(
    async (ai: GoogleGenAI, modelId: GeminiModelId) => {
      return await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              finalPrompt: { type: "STRING" },
              stackChoices: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
              designDirection: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
              heroConcept: { type: "STRING" },
              motionAndScrollPlan: { type: "STRING" },
              typographySystem: { type: "STRING" },
              keySections: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
              sourcesUsed: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
              assetStrategy: { type: "STRING" },
            },
            required: [
              "finalPrompt",
              "stackChoices",
              "designDirection",
              "heroConcept",
              "motionAndScrollPlan",
              "typographySystem",
              "keySections",
              "sourcesUsed",
            ],
          },
        },
      });
    },
    {
      customApiKey: options.customApiKey,
      preferredModel: options.preferredModel || "gemini-3.1-flash-lite",
      onProgress: schedulerCallback,
    }
  );

  const rawJson = execution.response.text || "{}";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    const cleaned = rawJson.replace(/```json/gi, "").replace(/```/g, "").trim();
    parsed = JSON.parse(cleaned);
  }

  const getStr = (val: unknown, fallback: string): string =>
    typeof val === "string" && val.trim() ? val : fallback;
  const getArr = (val: unknown, fallback: string[]): string[] =>
    Array.isArray(val) ? val.filter((item): item is string => typeof item === "string") : fallback;

  return {
    modelUsed: execution.modelUsed,
    keyIndexUsed: execution.keyIndexUsed,
    keyRotationUsed: execution.isKeyRotated,
    finalPrompt: getStr(parsed.finalPrompt, "Error generating build prompt."),
    stackChoices: getArr(parsed.stackChoices, [
      "Next.js 16 (App Router)",
      "React 19 & TypeScript",
      "Tailwind CSS v4",
      "Motion (motion/react)",
      "Lenis",
    ]),
    designDirection: getArr(parsed.designDirection, [
      "Dark-first obsidian (#09090b)",
      "Bento-grid modular layout",
      "Restrained Glassmorphism 2.0",
    ]),
    heroConcept: getStr(parsed.heroConcept, "Kinetic headline with soft ambient shader mesh background"),
    motionAndScrollPlan: getStr(parsed.motionAndScrollPlan, "Lenis momentum scroll with native CSS scroll-driven reveals"),
    typographySystem: getStr(parsed.typographySystem, "Outfit / Syne (Display) + Plus Jakarta Sans (Body)"),
    keySections: getArr(parsed.keySections, brief.pages),
    sourcesUsed: getArr(
      parsed.sourcesUsed,
      research.citations.map((c) => c.url)
    ),
    assetStrategy: getStr(
      parsed.assetStrategy,
      "Stylized placeholder imagery + procedural CSS/WebGL primitives flagged for client asset substitution."
    ),
    researchNotes: research,
  };
}

// =========================================================================
// BACKWARD COMPATIBILITY WRAPPERS
// =========================================================================

export async function runStageAResearch(
  brief: ClientBrief,
  options: PipelineExecutionOptions = {}
): Promise<ResearchNotes> {
  const batch1 = await runResearchBatch1(brief, options);
  return await runResearchBatch2(brief, batch1, options);
}

export async function runStageBSynthesis(
  brief: ClientBrief,
  research: ResearchNotes,
  options: PipelineExecutionOptions = {}
): Promise<Omit<GeneratedPromptData, "id" | "clientId" | "createdAt">> {
  return await runSynthesis(brief, research, options);
}

function extractSection(text: string, keyword: string, fallback: string): string {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(keyword)) {
      const paragraph = lines.slice(i, i + 5).join(" ").replace(/[#*`_]/g, "").trim();
      if (paragraph.length > 30) return paragraph.slice(0, 350);
    }
  }
  return fallback;
}
