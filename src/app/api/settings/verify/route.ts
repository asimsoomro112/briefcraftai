import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { apiKey, model = "gemini-3.8-flash" } = await req.json();
    const keyToTest = apiKey || process.env.GEMINI_API_KEY;

    if (!keyToTest) {
      return NextResponse.json(
        { valid: false, message: "No API key provided or found in server environment." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: keyToTest });
    const res = await ai.models.generateContent({
      model: model,
      contents: "Reply with the word 'READY' if you can read this.",
      config: {
        thinkingConfig: {
          thinkingLevel: "LOW" as any,
        },
      },
    });

    return NextResponse.json({
      valid: true,
      model,
      reply: res.text?.trim() || "READY",
    });
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, message: error?.message || "Failed to verify Gemini API key" },
      { status: 400 }
    );
  }
}
