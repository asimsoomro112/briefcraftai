import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    logs: [],
    count: 0,
    timestamp: new Date().toISOString(),
  });
}
