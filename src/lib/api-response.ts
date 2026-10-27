import { NextResponse } from "next/server";
import { AppError } from "./errors";

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  console.error("[API Error]:", error);
  return NextResponse.json(
    {
      error: "Внутренняя ошибка сервера. Пожалуйста, попробуйте позже.",
      code: "INTERNAL_SERVER_ERROR",
    },
    { status: 500 }
  );
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError(
      "Некорректный формат JSON в теле запроса.",
      400,
      "INVALID_JSON"
    );
  }
}
