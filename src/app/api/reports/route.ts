import { NextRequest, NextResponse } from "next/server";
import { generateReport } from "@/lib/services";
import { handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery: Record<string, string | undefined> = {
      start: searchParams.get("start") ?? undefined,
      end: searchParams.get("end") ?? undefined,
      employeeId: searchParams.get("employeeId") ?? undefined,
      tzOffset: searchParams.get("tzOffset") ?? undefined,
    };

    const report = await generateReport(rawQuery);
    return NextResponse.json({ report }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
