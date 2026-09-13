import { NextRequest } from "next/server";
import { runSynthesis } from "@/lib/gemini";
import { ClientBrief, GeneratedPromptData, ResearchNotes, GeminiModelId } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { brief, researchNotes, model = "gemini-3.1-flash-lite" } = body as {
    brief: ClientBrief;
    researchNotes: ResearchNotes;
    model?: GeminiModelId;
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

  const send = async (data: unknown) => {
    try {
      await writer.write(encoder.encode(JSON.stringify(data) + "\n"));
    } catch {}
  };

  (async () => {
    try {
      await send({
        type: "progress",
        stepNumber: 3,
        totalSteps: 3,
        message: `Re-synthesizing build prompt with your updated directives...`,
        progressPercent: 40,
      });

      const options = {
        preferredModel: model,
        customApiKey: clientApiKey,
        onProgress: async (update: {
          isWaiting?: boolean;
          message: string;
          waitSecondsRemaining?: number;
          stepNumber?: number;
        }) => {
          await send({
            type: update.isWaiting ? "waiting" : "progress",
            stepNumber: 3,
            totalSteps: 3,
            message: update.message,
            waitSecondsRemaining: update.waitSecondsRemaining,
            progressPercent: 60,
          });
        },
      };

      // Run Stage B Synthesis with scheduler & rotation
      const synthesis = await runSynthesis(brief, researchNotes, options);

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
    } catch (error: unknown) {
      console.error("API /api/regenerate pipeline error:", error);
      const rawMsg = error instanceof Error ? error.message : String(error);
      let friendlyMsg = rawMsg;
      if (rawMsg.includes("quota") || rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("429")) {
        friendlyMsg = "Gemini API key quota limit reached. Please check back after Pacific midnight.";
      } else if (rawMsg.includes("API_KEY_INVALID") || rawMsg.includes("invalid") || rawMsg.includes("403")) {
        friendlyMsg = "Invalid Gemini API key. Please check your credentials in .env.local.";
      } else if (rawMsg.includes("heavy load") || rawMsg.includes("503") || rawMsg.includes("UNAVAILABLE")) {
        friendlyMsg = "Gemini is under heavy load right now, retrying...";
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
