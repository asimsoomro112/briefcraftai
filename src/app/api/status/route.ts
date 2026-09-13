import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "briefcraft-ai",
    timestamp: new Date().toISOString(),
  });
}
