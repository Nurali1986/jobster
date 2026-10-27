import { NextRequest, NextResponse } from "next/server";
import { stopTimer } from "@/lib/services";
import { handleApiError, parseJsonBody } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request);
    const timeEntry = await stopTimer(body);
    return NextResponse.json({ timeEntry }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
