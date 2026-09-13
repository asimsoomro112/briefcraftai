import { NextRequest, NextResponse } from "next/server";
import { getPipelineJobState, deletePipelineJobState } from "@/lib/firestore";
import {
  getKeyRotationPool,
  getPacificDateString,
  getMillisUntilPacificMidnight,
  formatTimeRemaining,
  GEMINI_3_MODEL_CHAIN,
} from "@/lib/gemini-scheduler";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const briefId = searchParams.get("briefId");

  const keyPool = getKeyRotationPool();
  const resetInfo = getMillisUntilPacificMidnight();

  let jobState = null;
  if (briefId) {
    jobState = await getPipelineJobState(briefId);
  }

  return NextResponse.json({
    jobState,
    schedulerInfo: {
      keyPoolCount: keyPool.length,
      keys: keyPool.map((k) => ({
        index: k.index,
        masked: k.masked,
        source: k.source,
      })),
      pacificDate: getPacificDateString(),
      resetPacificTime: resetInfo.resetDatePacific,
      resetIsoString: resetInfo.resetIsoString,
      millisUntilReset: resetInfo.millis,
      timeUntilResetFormatted: formatTimeRemaining(resetInfo.millis),
      modelChain: GEMINI_3_MODEL_CHAIN.map((m) => ({
        id: m.modelId,
        name: m.name,
        rpm: m.rpm,
        dailyLimit: m.dailyLimit,
        tier: m.tier,
      })),
    },
  });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const briefId = searchParams.get("briefId");

  if (!briefId) {
    return NextResponse.json({ error: "briefId is required" }, { status: 400 });
  }

  await deletePipelineJobState(briefId);
  return NextResponse.json({ success: true });
}
