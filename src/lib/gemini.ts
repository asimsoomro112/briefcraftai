import { GoogleGenAI } from "@google/genai";
import { ClientBrief, GeneratedPromptData, GroundingCitation, ResearchNotes } from "@/types";

export type ProgressCallback = (update: {
  step: "stageA" | "stageB";
  message: string;
  isRetrying?: boolean;
  attempt?: number;
}) => void;

export interface PipelineOptions {
  model?: "gemini-3.8-flash" | "gemini-3.1-pro-preview";
  customApiKey?: string;
  onProgress?: ProgressCallback;
}

interface CallResult {
  response: any;
  modelUsed: string;
  isFallbackUsed: boolean;
  fallbackModelUsed?: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isOverloadedError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || "") + (err.status || "") + (typeof err === "string" ? err : "");
  return (
    msg.includes("503") ||
    msg.includes("high demand") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("overloaded")
  );
}

// Resilient API caller with 3 exponential backoff retries (2s, 4s, 8s) + gemini-3.7-flash / gemini-3.6-flash fallback
async function callGeminiWithExponentialBackoff(
  ai: GoogleGenAI,
  primaryModel: string,
  params: { contents: string; config?: any },
  step: "stageA" | "stageB",
  onProgress?: ProgressCallback
): Promise<CallResult> {
  const backoffDelays = [2000, 4000, 8000]; // 2s, 4s, 8s
  let lastError: any = null;

  // 1. Try primary model up to 3 retries (4 total attempts)
  for (let attempt = 0; attempt <= backoffDelays.length; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: primaryModel,
        contents: params.contents,
        config: params.config,
      });

      return {
        response,
        modelUsed: primaryModel,
        isFallbackUsed: false,
      };
    } catch (err: any) {
      lastError = err;
      if (!isOverloadedError(err) || attempt === backoffDelays.length) {
        // Either not an overload error, or exceeded all 3 retries on primaryModel
        break;
      }

      const delay = backoffDelays[attempt];
      const attemptNum = attempt + 1;
      const retryMessage = `Model is busy, retrying… (attempt ${attemptNum}/3 in ${delay / 1000}s)`;
      console.warn(`[Gemini Retry] ${primaryModel} 503/UNAVAILABLE. ${retryMessage}`);

      if (onProgress) {
        onProgress({
          step,
          message: retryMessage,
          isRetrying: true,
          attempt: attemptNum,
        });
      }

      await sleep(delay);
    }
  }

  // 2. If all 3 retries on primaryModel failed with 503, retry on fallback models (gemini-3.7-flash, then gemini-3.6-flash)
  if (isOverloadedError(lastError)) {
    const fallbackCandidates = ["gemini-3.7-flash", "gemini-3.6-flash"];

    for (const fallbackModel of fallbackCandidates) {
      const fallbackMsg = `Model is busy, retrying with fallback model (${fallbackModel})…`;
      console.warn(`[Gemini Fallback] Switching to ${fallbackModel}: ${fallbackMsg}`);

      if (onProgress) {
        onProgress({
          step,
          message: fallbackMsg,
          isRetrying: true,
        });
      }

      try {
        const fallbackResponse = await ai.models.generateContent({
          model: fallbackModel,
          contents: params.contents,
          config: params.config,
        });

        return {
          response: fallbackResponse,
          modelUsed: fallbackModel,
          isFallbackUsed: true,
          fallbackModelUsed: fallbackModel,
        };
      } catch (fallbackErr: any) {
        lastError = fallbackErr;
        console.warn(`[Gemini Fallback ${fallbackModel}] also failed:`, fallbackErr?.message || fallbackErr);
        if (!isOverloadedError(fallbackErr)) {
          break;
        }
        await sleep(1500);
      }
    }
  }

  // 3. If all attempts and fallbacks failed, throw a friendly user-facing error message (never raw JSON)
  if (isOverloadedError(lastError)) {
    throw new Error("Gemini is under heavy load right now, please try again in a minute.");
  }

  throw new Error(lastError?.message || "An unexpected error occurred while communicating with Gemini.");
}

export async function runStageAResearch(
  brief: ClientBrief,
  options: PipelineOptions = {}
): Promise<ResearchNotes> {
  const apiKey = options.customApiKey || process.env.GEMINI_API_KEY;
  const modelName = options.model || "gemini-3.8-flash";

  if (!apiKey) {
    throw new Error(
      "Missing Gemini API Key. Please configure GEMINI_API_KEY in .env.local or enter your key in Settings."
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const stageAPrompt = `
You are an elite 2026 principal creative technologist and web design director.
You are performing autonomous web research for a new web development client.

CLIENT BRIEF:
- Client / Business Name: ${brief.clientName}
- Industry: ${brief.industry}
- Description: ${brief.description}
- Target Audience: ${brief.targetAudience}
- Primary Site Goal: ${brief.primaryGoal}
- Tone & Personality: ${brief.tones.join(", ")}
- Pages Needed: ${brief.pages.join(", ")}
- Must-Have Features: ${brief.features.join(", ")}
- Brand Assets: ${
    brief.brand.hasExistingBrand
      ? `Existing brand colors: Primary ${brief.brand.primaryColor || "N/A"}, Secondary ${
          brief.brand.secondaryColor || "N/A"
        }, Accent ${brief.brand.accentColor || "N/A"}. Notes: ${brief.brand.brandNotes || "None"}`
      : "No existing brand - please suggest bespoke 2026 color system"
  }
- Competitor / Inspiration URLs: ${
    brief.competitorUrls.length > 0 ? brief.competitorUrls.join(", ") : "None provided"
  }
- Timeline / Scope Note: ${brief.timelineNotes || "Standard production"}

YOUR MISSION:
Autonomously research the current (2026) web, design, and tech landscape specifically for this client's industry (${
    brief.industry
  }) and tone (${brief.tones.join(", ")}).
Investigate what is currently awarded and trending on Awwwards, Land-book, and Godly (search for these by name for this industry) so recommendations reflect what is actually shipping right now, not a stale list.

You MUST research and return specific, named techniques and tools across every one of these 10 dimensions (do NOT stay generic like 'clean modern design'):
1. Overall trend fit: Current web design trends actually appropriate for this industry and tone (a luxury boutique brief should not get the same picks as a SaaS dashboard brief).
2. Scroll & motion behavior: Is a smooth-scroll library appropriate (momentum scrolling), and if so which specific approach fits the site's scale; whether the site needs scroll-triggered reveals/pinning/parallax, and whether that's better done with a lightweight native approach or a full animation-sequencing library.
3. Hero section concept: A specific hero treatment for this brand (oversized/kinetic typography as visual centerpiece vs. media-led hero vs. generative/animated background vs. product-led hero), not "an attractive hero section".
4. Background treatment: Whether the site benefits from a living/animated background (an animated gradient or generative texture behind key sections) versus a flat or static-image background, and where exactly on the page it should appear.
5. Typography system: A specific pairing (a display face for headings + a body face), whether headings should use gradient/color type, oversized type as a layout element, or kinetic/animated type on scroll or hover, and a fluid type scale approach.
6. Navigation & page transitions: Desktop floating glass top navbar (condensing on scroll) and mobile liquid glass bottom dock, plus whether transitions between pages/sections should be more than a simple fade.
7. Micro-interactions: Specific hover/cursor/button behaviors worth specifying (e.g. a button that reacts to cursor proximity, an image that reveals on hover, a form field that responds on focus) rather than leaving this unspecified.
8. Recommended frontend stack/libraries: Current recommended frontend stack/libraries for whichever of the above are chosen for this brief.
9. Competitor / Inspiration analysis: If competitor/inspiration URLs were provided, analyze them and note what to borrow or avoid; if none provided, analyze the top 2026 industry leaders.
10. Awwwards / Land-book / Godly trends: Look specifically at what's currently being awarded/featured on sites like Awwwards, Land-book, and Godly for this industry.

BASELINE 2026 TOOLKIT REFERENCE (Treat as starting knowledge for dimensions 2–7, confirm/update with live search):
- Smooth scroll: Lenis is the current standard (lightweight, ~3kB, doesn't break position: sticky or Intersection Observer) for most sites — install as \`npm install lenis\` and import from \`'lenis'\` (the React wrapper is \`'lenis/react'\`); the old \`@studio-freight/lenis\` / \`@studio-freight/react-lenis\` package names are deprecated and must NEVER be output. Reserve GSAP + ScrollTrigger for sites that need complex pinned sequences, SVG path morphing, or precisely choreographed multi-step scroll stories; for simple scroll-triggered reveals with no complex sequencing, prefer the native CSS \`animation-timeline: view()\`/\`scroll()\` approach — it needs no JS and no bundle weight.
- Backgrounds: Animated WebGL/shader gradients (mesh, liquid, plasma, grain/noise textures) for brands wanting a "living" feel — but only where it earns its cost: cap device pixel ratio on mobile, provide a static-image fallback when \`prefers-reduced-motion\` is set, and never default to WebGL when a CSS gradient would do the job.
- Hero typography: Variable fonts are the default technical choice now (one file, many weights/widths); gradient/color type via COLRv1 color fonts is viable and stays selectable/accessible text, unlike a gradient baked into an image; oversized type as the primary visual element is a strong, current option for brand-forward or portfolio-style briefs.
- Micro-interactions: Magnetic buttons (cursor-attraction effect) and subtle focus/success/error state animations are expected on premium sites now — call these out by name, don't leave them implicit.
- Always pair any motion decision with an accessibility note: what happens under \`prefers-reduced-motion\`.
- GUARDRAIL ON AMBITIOUS VISUAL CONCEPTS: If the chosen hero/background concept involves realistic 3D rendering, physically-based light simulation (e.g. caustics, refraction through a modeled object), or any effect that needs a 3D asset (.glb/.gltf model), you must specify (a) a concretely buildable technique (e.g. a procedural noise/refraction shader approximation using Three.js/React Three Fiber that needs no external 3D asset, or a pre-rendered looping video/WebM as a lighter-weight alternative) and (b) where any required 3D/image asset comes from when the client hasn't supplied one (placeholder primitives, a generated stylized asset, or a clearly flagged "swap in real product photography/3D scans here" placeholder). Never leave a headline visual effect as a one-line aspiration with no implementation path.

Provide a comprehensive, structured research report with clear sections for each dimension.
`;

  if (options.onProgress) {
    options.onProgress({
      step: "stageA",
      message: `Stage A: Researching live 2026 web design & tech landscape for ${brief.industry}...`,
    });
  }

  // First try with Google Search Grounding tool
  try {
    const result = await callGeminiWithExponentialBackoff(
      ai,
      modelName,
      {
        contents: stageAPrompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: {
            thinkingLevel: "HIGH" as any,
          },
        },
      },
      "stageA",
      options.onProgress
    );

    const text = result.response.text || "";
    const candidate = result.response.candidates?.[0];
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

    const notes = parseResearchResponse(text, citations, searchQueries, true);
    notes.isFallbackUsed = result.isFallbackUsed;
    notes.fallbackModelUsed = result.fallbackModelUsed;
    return notes;
  } catch (err: any) {
    console.warn(
      "[Stage A Search Grounding] Tool query quota limited or unavailable. Falling back to real model knowledge:",
      err?.message || err
    );

    // Fall back to real model deep knowledge without search tool, with retries and fallback models
    const result = await callGeminiWithExponentialBackoff(
      ai,
      modelName,
      {
        contents: stageAPrompt,
        config: {
          thinkingConfig: {
            thinkingLevel: "HIGH" as any,
          },
        },
      },
      "stageA",
      options.onProgress
    );

    const text = result.response.text || "";
    const notes = parseResearchResponse(text, [], [], false);
    notes.isFallbackUsed = result.isFallbackUsed;
    notes.fallbackModelUsed = result.fallbackModelUsed;
    return notes;
  }
}

export async function runStageBSynthesis(
  brief: ClientBrief,
  research: ResearchNotes,
  options: PipelineOptions = {}
): Promise<Omit<GeneratedPromptData, "id" | "clientId" | "createdAt">> {
  const apiKey = options.customApiKey || process.env.GEMINI_API_KEY;
  const modelName = options.model || "gemini-3.8-flash";

  if (!apiKey) {
    throw new Error(
      "Missing Gemini API Key. Please configure GEMINI_API_KEY in .env.local or enter your key in Settings."
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  if (options.onProgress) {
    options.onProgress({
      step: "stageB",
      message: `Stage B: Synthesizing master build prompt with structured output...`,
    });
  }

  const stageBPrompt = `
You are an expert senior prompt engineer and creative technologist.
Your task is to synthesize the client brief and the 2026 design/tech research findings into ONE master, production-grade "Build Prompt".
This build prompt will be fed directly into an AI coding agent (Google AI Studio Build mode or Antigravity) to generate the client's actual website with no further editing needed.

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
It must read like a senior designer's brief, NOT a generic checklist.
It must make concrete, named decisions in EVERY ONE of these 12 areas:

1. Project overview, target audience & tone: Clear executive summary of the business, target persona, and brand vibe.
2. Sitemap: Definitive page-by-page structure and information architecture.
3. Full design system: Color palette (Hex codes with reasoning tied to the brand/industry), the specific font pairing chosen and why (named Google Fonts: display face + body face), and a fluid type scale.
4. The specific hero section concept chosen: Name the actual approach (e.g. "oversized kinetic headline that splits and reveals word-by-word on load, paired with a subtle animated gradient-mesh background capped at 30fps on mobile") — NEVER "an attractive hero section".
5. The specific scroll/motion plan chosen: Which library or native approach (Lenis vs GSAP vs native CSS animation-timeline: view()), and which sections use scroll-triggered reveals vs. pinning vs. plain fades.
6. Named micro-interactions per key component: Buttons (cursor-attraction magnetic buttons), cards (3D perspective tilt), forms (ambient glowing focus states), and navigation.
7. Exact tech stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Motion (must import from 'motion/react', never 'framer-motion'), Lenis (must specify 'npm install lenis' and import from 'lenis' or 'lenis/react'; NEVER output deprecated @studio-freight/lenis), shadcn/ui, and Lucide Icons.
8. Component/section list with functionality: Every section and module detailed with interactive behaviors.
9. Content/copy guidance per section: Specific headlines, value propositions, and CTA copy directives.
10. SEO + accessibility + performance requirements: Explicitly including a 'prefers-reduced-motion' fallback plan for EVERY animated/motion element specified above, plus WCAG AA contrast standards.
11. Responsive requirements — MUST include two things every time, not just breakpoint widths:
    (a) Mobile persistent identity/brand element: Mobile MUST always get its own persistent identity/brand element (a compact top bar ~56px condensing to ~44px, even a minimal one with brand mark/wordmark) in addition to any bottom nav dock — NEVER leave mobile with only a bottom dock and nothing at the top;
    (b) Touch-appropriate mobile equivalents: Every cursor-dependent interaction specified elsewhere in the prompt (magnetic buttons, cursor-tilt cards, horizontal-pinned scroll sequences) MUST have an explicitly named touch-appropriate mobile equivalent (e.g. active tap haptic/scale feedback instead of magnetic hover, touch swipe carousel instead of pinned horizontal scroll, subtle elevation or static state instead of mouse tilt) — NEVER let a desktop-only interaction go unaddressed for mobile.
12. Asset strategy: Since this is a new/fictional client with no supplied photography or 3D assets yet, state explicitly what the coding agent should use as placeholders (generated stylized imagery, primitive 3D shapes, stock-style placeholders) for every visual element named above that would normally need real product photos or a 3D model — never leave this implicit!

CRITICAL GUARDRAIL ON AMBITIOUS VISUAL CONCEPTS:
If the chosen hero or background concept involves realistic 3D rendering, physically-based light simulation (e.g. caustics, refraction through a modeled object), or any effect that needs a 3D asset (.glb/.gltf model), finalPrompt must NEVER name the effect and stop there. It MUST also specify:
(a) a concretely buildable technique (e.g. a procedural noise/refraction shader approximation using Three.js/React Three Fiber that needs no external 3D asset, or a pre-rendered looping video/WebM as a lighter-weight alternative), AND
(b) where any required 3D/image asset comes from when the client hasn't supplied one (placeholder primitives, a generated stylized asset, or a clearly flagged "swap in real product photography/3D scans here" placeholder). Never leave a headline visual effect as a one-line aspiration with no implementation path!

OUTPUT FORMAT:
Return a valid JSON object matching this schema (do NOT wrap with markdown backticks):
{
  "finalPrompt": "string — the complete, ready-to-paste build prompt formatted in markdown covering all 12 areas with numbered section headers",
  "stackChoices": ["string"],
  "designDirection": ["string"],
  "heroConcept": "string",
  "motionAndScrollPlan": "string",
  "typographySystem": "string",
  "keySections": ["string"],
  "sourcesUsed": ["string"],
  "assetStrategy": "string — summary of placeholder strategy and asset substitution plan"
}
`;

  // Stage B Structured Synthesis with exponential backoff & model fallback
  const result = await callGeminiWithExponentialBackoff(
    ai,
    modelName,
    {
      contents: stageBPrompt,
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
        thinkingConfig: {
          thinkingLevel: "HIGH" as any,
        },
      },
    },
    "stageB",
    options.onProgress
  );

  const rawJson = result.response.text || "{}";
  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    const cleaned = rawJson.replace(/```json/gi, "").replace(/```/g, "").trim();
    parsed = JSON.parse(cleaned);
  }

  // Update research notes with fallback model notice if used
  if (result.isFallbackUsed && result.fallbackModelUsed) {
    research.isFallbackUsed = true;
    research.fallbackModelUsed = result.fallbackModelUsed;
  }

  return {
    modelUsed: (result.fallbackModelUsed || result.modelUsed) as any,
    finalPrompt: parsed.finalPrompt || "Error generating build prompt.",
    stackChoices: Array.isArray(parsed.stackChoices)
      ? parsed.stackChoices
      : ["Next.js 16 (App Router)", "React 19 & TypeScript", "Tailwind CSS v4", "Motion (motion/react)", "Lenis"],
    designDirection: Array.isArray(parsed.designDirection)
      ? parsed.designDirection
      : ["Dark-first obsidian (#09090b)", "Bento-grid modular layout", "Restrained Glassmorphism 2.0"],
    heroConcept: parsed.heroConcept || "Kinetic headline with soft ambient shader mesh background",
    motionAndScrollPlan:
      parsed.motionAndScrollPlan || "Lenis momentum scroll with native CSS scroll-driven reveals",
    typographySystem: parsed.typographySystem || "Outfit / Syne (Display) + Plus Jakarta Sans (Body)",
    keySections: Array.isArray(parsed.keySections) ? parsed.keySections : brief.pages,
    sourcesUsed: Array.isArray(parsed.sourcesUsed)
      ? parsed.sourcesUsed
      : research.citations.map((c) => c.url),
    assetStrategy:
      parsed.assetStrategy ||
      "Unsplash/Pexels stylized placeholder imagery + procedural CSS/WebGL primitives flagged for client asset substitution.",
    researchNotes: research,
  };
}

function parseResearchResponse(
  rawText: string,
  citations: GroundingCitation[],
  searchQueries: string[],
  isLiveResearched: boolean
): ResearchNotes {
  return {
    summary: rawText.slice(0, 500) + (rawText.length > 500 ? "..." : ""),
    trendFit: extractSection(
      rawText,
      "trend",
      "Contemporary minimalist layout with expressive typography and dark obsidian tones tailored to the sector."
    ),
    scrollMotionAdvice: extractSection(
      rawText,
      "scroll",
      "Lenis smooth momentum scrolling paired with native scroll-driven animations for maximum 60fps performance."
    ),
    heroConceptAdvice: extractSection(
      rawText,
      "hero",
      "Oversized kinetic split-text headline with soft ambient shader gradient glow and mobile 30fps throttle."
    ),
    backgroundAdvice: extractSection(
      rawText,
      "background",
      "Subtle animated WebGL noise/mesh gradient behind hero and key value propositions, falling back to static CSS gradients on prefers-reduced-motion."
    ),
    typographyAdvice: extractSection(
      rawText,
      "typography",
      "Display: Syne or Cabinet Grotesk; Body: Plus Jakarta Sans with fluid CSS clamp() scaling."
    ),
    navTransitionsAdvice: extractSection(
      rawText,
      "nav",
      "Floating glass top navbar condensing 72px to 48px on desktop, floating iOS 26 liquid glass bottom dock on mobile."
    ),
    microInteractionsAdvice: extractSection(
      rawText,
      "micro",
      "Magnetic cursor attraction buttons, 3D card perspective tilt on hover, and ambient radial glow borders."
    ),
    stackRecommendations: extractSection(
      rawText,
      "stack",
      "Next.js 16 (App Router), React 19, Tailwind CSS v4, Motion (motion/react), Lenis, Lucide Icons."
    ),
    competitorAnalysis: extractSection(
      rawText,
      "competitor",
      "Emphasizes fast load times, clear CTA hierarchy, and avoids cluttered 2021 gradient blobs in favor of clean bento modules."
    ),
    awwwardsTrends: extractSection(
      rawText,
      "awwward",
      "Awwwards Site of the Day finalists favor restrained glassmorphism, variable font animation, and tactile haptic cues."
    ),
    citations,
    searchQueriesUsed: searchQueries,
    isLiveResearched,
  };
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
