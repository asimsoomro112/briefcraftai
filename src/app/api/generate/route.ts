import { NextRequest } from "next/server";
import { executeResumablePipeline, PipelineStreamEvent } from "@/lib/pipeline-coordinator";
import { GeminiModelId } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Allow sufficient duration for pacing intervals

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { brief, model = "gemini-3.1-flash-lite" } = body;

  if (!brief || !brief.clientName || !brief.industry) {
    return new Response(
      JSON.stringify({ error: "Invalid client brief. Name and industry are required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const clientApiKey = req.headers.get("x-gemini-api-key") || undefined;
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const send = async (data: PipelineStreamEvent) => {
    try {
      await writer.write(encoder.encode(JSON.stringify(data) + "\n"));
    } catch {
      // client disconnected
    }
  };

  (async () => {
    try {
      await executeResumablePipeline(brief, {
        customApiKey: clientApiKey,
        preferredModel: model as GeminiModelId,
        emit: send,
      });
    } catch (error: unknown) {
      console.error("API /api/generate pipeline error:", error);
      const isQuotaWall = typeof error === "object" && error !== null && "name" in error && (error as { name: string }).name === "QuotaWallError";
      if (isQuotaWall) {
        // Quota wall already emitted by coordinator, ensure safe finish
      } else {
        const rawMsg = error instanceof Error ? error.message : String(error);
        let friendlyMsg = rawMsg;
        if (rawMsg.includes("quota") || rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("429")) {
          friendlyMsg = "Gemini API key quota limit reached. Please add a second/third key or check back after Pacific midnight.";
        } else if (rawMsg.includes("API_KEY_INVALID") || rawMsg.includes("invalid") || rawMsg.includes("403")) {
          friendlyMsg = "Invalid Gemini API key. Please check your credentials in .env.local or enter a valid key in Settings.";
        } else if (rawMsg.includes("heavy load") || rawMsg.includes("503") || rawMsg.includes("UNAVAILABLE")) {
          friendlyMsg = "Gemini is experiencing temporary load, retrying...";
        } else if (!friendlyMsg) {
          friendlyMsg = "An error occurred during pipeline execution.";
        }
        await send({
          type: "error",
          error: friendlyMsg,
        });
      }
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
