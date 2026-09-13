import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getKeyRotationPool, maskKey } from "@/lib/gemini-scheduler";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { apiKey, model = "gemini-3.1-flash-lite" } = await req.json();
    const serverPool = getKeyRotationPool();
    const keyToTest = apiKey || (serverPool.length > 0 ? serverPool[0].key : undefined);

    if (!keyToTest) {
      return NextResponse.json(
        {
          valid: false,
          message: "No API key provided or found in server environment (GEMINI_API_KEY_1 / GEMINI_API_KEY).",
          serverKeyPoolCount: 0,
        },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: keyToTest });
    const res = await ai.models.generateContent({
      model: model,
      contents: "Reply with the single word 'READY'.",
    });

    return NextResponse.json({
      valid: true,
      model,
      reply: res.text?.trim() || "READY",
      testedKeyMask: maskKey(keyToTest),
      serverKeyPoolCount: serverPool.length,
      serverKeysMasked: serverPool.map((k) => k.masked),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        valid: false,
        message: error instanceof Error ? error.message : "Failed to verify Gemini API key",
        serverKeyPoolCount: getKeyRotationPool().length,
      },
      { status: 400 }
    );
  }
}
