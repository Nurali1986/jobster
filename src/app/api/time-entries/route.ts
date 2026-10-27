import { NextRequest, NextResponse } from "next/server";
import { listTimeEntries } from "@/lib/services";
import { handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery: Record<string, string | undefined> = {
      employeeId: searchParams.get("employeeId") ?? undefined,
      start: searchParams.get("start") ?? undefined,
      end: searchParams.get("end") ?? undefined,
      activeOnly: searchParams.get("activeOnly") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      tzOffset: searchParams.get("tzOffset") ?? undefined,
    };

    const timeEntries = await listTimeEntries(rawQuery);
    return NextResponse.json({ timeEntries }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
