import { NextRequest } from "next/server";
import { runStageBSynthesis } from "@/lib/gemini";
import { ClientBrief, GeneratedPromptData, ResearchNotes } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Max execution time for Vercel Serverless Functions

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { brief, researchNotes, model = "gemini-3.8-flash" } = body as {
    brief: ClientBrief;
    researchNotes: ResearchNotes;
    model?: "gemini-3.8-flash" | "gemini-3.1-pro-preview";
  };

  if (!brief || !researchNotes) {
    return new Response(
      JSON.stringify({ error: "Both client brief and research notes are required for regeneration." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const clientApiKey = req.headers.get("x-gemini-api-key") || undefined;
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const send = async (data: any) => {
    try {
      await writer.write(encoder.encode(JSON.stringify(data) + "\n"));
    } catch {}
  };

  (async () => {
    try {
      await send({
        type: "progress",
        step: "stageB",
        message: `Re-synthesizing build prompt with your updated directives...`,
        progressPercent: 40,
      });

      const options = {
        model,
        customApiKey: clientApiKey,
        onProgress: async (update: any) => {
          await send({
            type: "progress",
            step: update.step,
            message: update.message,
            isRetrying: update.isRetrying,
            progressPercent: 60,
          });
        },
      };

      // Run Stage B only
      const synthesis = await runStageBSynthesis(brief, researchNotes, options);

      const promptId = `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fullResult: GeneratedPromptData = {
        id: promptId,
        clientId: brief.id,
        ...synthesis,
        createdAt: new Date().toISOString(),
      };

      await send({
        type: "complete",
        data: fullResult,
      });
    } catch (error: any) {
      console.error("API /api/regenerate pipeline error:", error);
      const rawMsg = error?.message || "";
      let friendlyMsg = rawMsg;
      if (rawMsg.includes("quota") || rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("429")) {
        friendlyMsg = "Gemini API key quota limit reached. Please enter your personal Google AI Studio API key to continue generating.";
      } else if (rawMsg.includes("API_KEY_INVALID") || rawMsg.includes("invalid") || rawMsg.includes("403")) {
        friendlyMsg = "Invalid Gemini API key. Please check your API key or enter a valid Google AI Studio key.";
      } else if (rawMsg.includes("heavy load") || rawMsg.includes("503") || rawMsg.includes("UNAVAILABLE")) {
        friendlyMsg = "Gemini is under heavy load right now, please try again in a minute.";
      } else if (!friendlyMsg) {
        friendlyMsg = "Internal server error in regeneration pipeline.";
      }
      await send({
        type: "error",
        error: friendlyMsg,
      });
    } finally {
      try {
        await writer.close();
      } catch {}
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
