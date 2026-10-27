import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.employee.count();

    return NextResponse.json(
      {
        status: "ok",
        database: "connected",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Healthcheck Error]:", error);
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        error: "База данных недоступна или миграции не применены.",
      },
      { status: 503 }
    );
  }
}
