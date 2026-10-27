import { NextRequest, NextResponse } from "next/server";
import { createEmployee, listEmployees } from "@/lib/services";
import { handleApiError, parseJsonBody } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const active = searchParams.get("active");

    const employees = await listEmployees({ search, active });
    return NextResponse.json({ employees }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request);
    const employee = await createEmployee(body);
    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
