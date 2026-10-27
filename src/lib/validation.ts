import { z } from "zod";
import { ValidationError } from "./errors";

const optionalTrimmedString = (maxLen: number, fieldLabel: string) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (typeof val !== "string") return null;
      const trimmed = val.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .refine((val) => val === null || val.length <= maxLen, {
      message: `Поле "${fieldLabel}" не должно превышать ${maxLen} символов.`,
    });

export const createEmployeeSchema = z.object({
  name: z
    .string({
      required_error: "Имя сотрудника обязательно для заполнения.",
      invalid_type_error: "Имя сотрудника должно быть строкой.",
    })
    .trim()
    .min(1, "Имя сотрудника не может быть пустым.")
    .max(120, "Имя сотрудника не должно превышать 120 символов."),
  position: optionalTrimmedString(120, "Должность"),
  email: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (typeof val !== "string") return null;
      const trimmed = val.trim().toLowerCase();
      return trimmed.length === 0 ? null : trimmed;
    })
    .refine(
      (val) => val === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Укажите корректный адрес электронной почты (email)."
    ),
});

export const updateEmployeeSchema = z
  .object({
    name: z
      .string({ invalid_type_error: "Имя сотрудника должно быть строкой." })
      .trim()
      .min(1, "Имя сотрудника не может быть пустым.")
      .max(120, "Имя сотрудника не должно превышать 120 символов.")
      .optional(),
    position: optionalTrimmedString(120, "Должность").optional(),
    email: z
      .union([z.string(), z.null()])
      .transform((val) => {
        if (val === null) return null;
        const trimmed = val.trim().toLowerCase();
        return trimmed.length === 0 ? null : trimmed;
      })
      .refine(
        (val) => val === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
        "Укажите корректный адрес электронной почты (email)."
      )
      .optional(),
    isActive: z
      .boolean({
        invalid_type_error: "Статус активности должен быть булевым значением.",
      })
      .optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.position !== undefined ||
      data.email !== undefined ||
      data.isActive !== undefined,
    {
      message: "Не переданы поля для обновления данных сотрудника.",
    }
  );

export const startTimerSchema = z.object({
  employeeId: z
    .string({
      required_error: "Необходимо выбрать сотрудника.",
      invalid_type_error: "Идентификатор сотрудника должен быть строкой.",
    })
    .trim()
    .min(1, "Необходимо выбрать сотрудника."),
  taskDescription: z
    .string({
      required_error: "Необходимо указать описание задачи.",
      invalid_type_error: "Описание задачи должно быть строкой.",
    })
    .trim()
    .min(1, "Описание задачи не может быть пустым или состоять только из пробелов.")
    .max(500, "Описание задачи не должно превышать 500 символов."),
});

export const stopTimerSchema = z
  .object({
    timeEntryId: z.string().trim().min(1).optional(),
    employeeId: z.string().trim().min(1).optional(),
  })
  .refine((data) => Boolean(data.timeEntryId || data.employeeId), {
    message: "Необходимо указать идентификатор записи (timeEntryId) или сотрудника (employeeId).",
  });

export const timeEntriesQuerySchema = z.object({
  employeeId: z.string().trim().min(1).optional(),
  start: z.string().trim().optional(),
  end: z.string().trim().optional(),
  activeOnly: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform((v) => Math.min(500, Math.max(1, Number(v))))
    .optional(),
  tzOffset: z
    .string()
    .regex(/^-?\d+$/)
    .transform((v) => Number(v))
    .optional(),
});

export const reportsQuerySchema = z.object({
  start: z
    .string({
      required_error: "Параметр начала периода (start) обязателен.",
    })
    .trim()
    .min(1, "Параметр начала периода (start) не может быть пустым."),
  end: z
    .string({
      required_error: "Параметр окончания периода (end) обязателен.",
    })
    .trim()
    .min(1, "Параметр окончания периода (end) не может быть пустым."),
  employeeId: z.string().trim().min(1).optional(),
  tzOffset: z
    .string()
    .regex(/^-?\d+$/)
    .transform((v) => Number(v))
    .optional(),
});

export function validateWithZod<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  input: unknown
): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new ValidationError(firstIssue?.message ?? "Ошибка валидации входных данных.");
  }
  return result.data;
}
