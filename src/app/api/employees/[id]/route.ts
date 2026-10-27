import { NextRequest, NextResponse } from "next/server";
import { getEmployeeById, updateEmployee } from "@/lib/services";
import { handleApiError, parseJsonBody } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const employee = await getEmployeeById(context.params.id);
    return NextResponse.json({ employee }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const body = await parseJsonBody(request);
    const employee = await updateEmployee(context.params.id, body);
    return NextResponse.json({ employee }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
