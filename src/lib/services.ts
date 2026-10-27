import { Prisma, PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import {
  createEmployeeSchema,
  reportsQuerySchema,
  startTimerSchema,
  stopTimerSchema,
  timeEntriesQuerySchema,
  updateEmployeeSchema,
  validateWithZod,
} from "./validation";
import {
  buildPeriodReport,
  calculateEntryDurationMs,
  formatDurationEntry,
  parseOptionalDateFilter,
  parsePeriodRange,
  PeriodReportResult,
} from "./time";

function isUniqueConstraintError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2002" || error.code === "P2034";
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: string }).code;
    return code === "P2002" || code === "P2034" || code === "23505";
  }
  return false;
}

export async function listEmployees(
  params?: { search?: string | null; active?: string | null },
  db: PrismaClient = defaultPrisma
) {
  const where: Prisma.EmployeeWhereInput = {};

  if (params?.active === "true") {
    where.isActive = true;
  } else if (params?.active === "false") {
    where.isActive = false;
  }

  if (params?.search && params.search.trim() !== "") {
    const q = params.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { position: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const employees = await db.employee.findMany({
    where,
    include: {
      timeEntries: {
        where: { endTime: null },
        take: 1,
      },
      _count: {
        select: { timeEntries: true },
      },
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return employees.map((emp) => ({
    id: emp.id,
    name: emp.name,
    email: emp.email,
    position: emp.position,
    isActive: emp.isActive,
    createdAt: emp.createdAt.toISOString(),
    updatedAt: emp.updatedAt.toISOString(),
    totalEntriesCount: emp._count.timeEntries,
    activeTimer: emp.timeEntries[0]
      ? {
          id: emp.timeEntries[0].id,
          taskDescription: emp.timeEntries[0].taskDescription,
          startTime: emp.timeEntries[0].startTime.toISOString(),
        }
      : null,
  }));
}

export async function getEmployeeById(id: string, db: PrismaClient = defaultPrisma) {
  if (!id || id.trim() === "") {
    throw new ValidationError("Некорректный идентификатор сотрудника.");
  }

  const employee = await db.employee.findUnique({
    where: { id },
    include: {
      timeEntries: {
        where: { endTime: null },
        take: 1,
      },
      _count: {
        select: { timeEntries: true },
      },
    },
  });

  if (!employee) {
    throw new NotFoundError("Сотрудник не найден.");
  }

  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    position: employee.position,
    isActive: employee.isActive,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
    totalEntriesCount: employee._count.timeEntries,
    activeTimer: employee.timeEntries[0]
      ? {
          id: employee.timeEntries[0].id,
          taskDescription: employee.timeEntries[0].taskDescription,
          startTime: employee.timeEntries[0].startTime.toISOString(),
        }
      : null,
  };
}

export async function createEmployee(input: unknown, db: PrismaClient = defaultPrisma) {
  const data = validateWithZod(createEmployeeSchema, input);

  if (data.email) {
    const existing = await db.employee.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new ConflictError("Сотрудник с таким email уже существует.");
    }
  }

  try {
    const created = await db.employee.create({
      data: {
        name: data.name,
        position: data.position,
        email: data.email,
        isActive: true,
      },
    });

    return {
      id: created.id,
      name: created.name,
      email: created.email,
      position: created.position,
      isActive: created.isActive,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      totalEntriesCount: 0,
      activeTimer: null,
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ConflictError("Сотрудник с таким email уже существует.");
    }
    throw error;
  }
}

export async function updateEmployee(
  id: string,
  input: unknown,
  db: PrismaClient = defaultPrisma
) {
  if (!id || id.trim() === "") {
    throw new ValidationError("Некорректный идентификатор сотрудника.");
  }

  const data = validateWithZod(updateEmployeeSchema, input);

  const existing = await db.employee.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError("Сотрудник не найден.");
  }

  if (data.email !== undefined && data.email !== null && data.email !== existing.email) {
    const duplicate = await db.employee.findUnique({
      where: { email: data.email },
    });
    if (duplicate && duplicate.id !== id) {
      throw new ConflictError("Сотрудник с таким email уже существует.");
    }
  }

  try {
    const updated = await db.employee.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.position !== undefined ? { position: data.position } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: {
        timeEntries: {
          where: { endTime: null },
          take: 1,
        },
        _count: {
          select: { timeEntries: true },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      position: updated.position,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      totalEntriesCount: updated._count.timeEntries,
      activeTimer: updated.timeEntries[0]
        ? {
            id: updated.timeEntries[0].id,
            taskDescription: updated.timeEntries[0].taskDescription,
            startTime: updated.timeEntries[0].startTime.toISOString(),
          }
        : null,
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ConflictError("Сотрудник с таким email уже существует.");
    }
    throw error;
  }
}

export async function startTimer(input: unknown, db: PrismaClient = defaultPrisma) {
  const data = validateWithZod(startTimerSchema, input);

  try {
    const entry = await db.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: data.employeeId },
      });

      if (!employee) {
        throw new NotFoundError("Сотрудник не найден.");
      }

      if (!employee.isActive) {
        throw new ConflictError(
          "Деактивированный сотрудник не может запустить новый таймер."
        );
      }

      const activeEntry = await tx.timeEntry.findFirst({
        where: {
          employeeId: data.employeeId,
          endTime: null,
        },
      });

      if (activeEntry) {
        throw new ConflictError(
          "У сотрудника уже запущен активный таймер. Сначала остановите текущую задачу."
        );
      }

      const now = new Date();
      return tx.timeEntry.create({
        data: {
          employeeId: data.employeeId,
          taskDescription: data.taskDescription,
          startTime: now,
          endTime: null,
        },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              email: true,
              position: true,
              isActive: true,
            },
          },
        },
      });
    });

    return {
      id: entry.id,
      employeeId: entry.employeeId,
      taskDescription: entry.taskDescription,
      startTime: entry.startTime.toISOString(),
      endTime: null,
      isActive: true,
      durationMs: 0,
      formattedDuration: "0 ч 0 мин",
      employee: entry.employee,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ConflictError || error instanceof ValidationError) {
      throw error;
    }
    if (isUniqueConstraintError(error)) {
      throw new ConflictError(
        "У сотрудника уже запущен активный таймер. Сначала остановите текущую задачу."
      );
    }
    throw error;
  }
}

export async function stopTimer(input: unknown, db: PrismaClient = defaultPrisma) {
  const data = validateWithZod(stopTimerSchema, input);

  return db.$transaction(async (tx) => {
    let targetEntry = null;

    if (data.timeEntryId) {
      targetEntry = await tx.timeEntry.findUnique({
        where: { id: data.timeEntryId },
      });

      if (!targetEntry) {
        throw new NotFoundError("Запись времени не найдена.");
      }

      if (targetEntry.endTime !== null) {
        throw new ConflictError("Этот таймер уже остановлен.");
      }
    } else if (data.employeeId) {
      const employee = await tx.employee.findUnique({
        where: { id: data.employeeId },
      });

      if (!employee) {
        throw new NotFoundError("Сотрудник не найден.");
      }

      targetEntry = await tx.timeEntry.findFirst({
        where: {
          employeeId: data.employeeId,
          endTime: null,
        },
      });

      if (!targetEntry) {
        throw new ConflictError("У сотрудника нет активного таймера для остановки.");
      }
    }

    if (!targetEntry) {
      throw new NotFoundError("Активный таймер не найден.");
    }

    const nowMs = Date.now();
    const safeEndMs = Math.max(nowMs, targetEntry.startTime.getTime() + 1);
    const endTime = new Date(safeEndMs);

    const updateResult = await tx.timeEntry.updateMany({
      where: {
        id: targetEntry.id,
        endTime: null,
      },
      data: {
        endTime,
      },
    });

    if (updateResult.count === 0) {
      throw new ConflictError("Этот таймер уже остановлен.");
    }

    const stopped = await tx.timeEntry.findUniqueOrThrow({
      where: { id: targetEntry.id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
            isActive: true,
          },
        },
      },
    });

    const durationMs = calculateEntryDurationMs(stopped.startTime, stopped.endTime, endTime);

    return {
      id: stopped.id,
      employeeId: stopped.employeeId,
      taskDescription: stopped.taskDescription,
      startTime: stopped.startTime.toISOString(),
      endTime: stopped.endTime ? stopped.endTime.toISOString() : endTime.toISOString(),
      isActive: false,
      durationMs,
      formattedDuration: formatDurationEntry(durationMs),
      employee: stopped.employee,
    };
  });
}

export async function listTimeEntries(
  rawQuery: Record<string, string | undefined>,
  db: PrismaClient = defaultPrisma
) {
  const query = validateWithZod(timeEntriesQuerySchema, rawQuery);
  const { periodStart, periodEnd } = parseOptionalDateFilter(
    query.start,
    query.end,
    query.tzOffset ?? 0
  );

  const where: Prisma.TimeEntryWhereInput = {};

  if (query.employeeId) {
    where.employeeId = query.employeeId;
  }

  if (query.activeOnly) {
    where.endTime = null;
  }

  // Пересечение с полуоткрытым интервалом [periodStart, periodEnd):
  // startTime < periodEnd И (endTime IS NULL ИЛИ endTime > periodStart)
  if (periodStart && periodEnd) {
    where.AND = [
      { startTime: { lt: periodEnd } },
      { OR: [{ endTime: null }, { endTime: { gt: periodStart } }] },
    ];
  } else if (periodStart) {
    where.OR = [{ endTime: null }, { endTime: { gt: periodStart } }];
  } else if (periodEnd) {
    where.startTime = { lt: periodEnd };
  }

  const entries = await db.timeEntry.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          position: true,
          isActive: true,
        },
      },
    },
    orderBy: [{ endTime: "asc" }, { startTime: "desc" }],
    take: query.limit ?? 200,
  });

  // Сортируем: сначала активные (endTime === null) по убыванию startTime, затем завершённые по убыванию startTime
  const sorted = [...entries].sort((a, b) => {
    if (a.endTime === null && b.endTime !== null) return -1;
    if (a.endTime !== null && b.endTime === null) return 1;
    return b.startTime.getTime() - a.startTime.getTime();
  });

  const now = new Date();
  return sorted.map((entry) => {
    const durationMs = calculateEntryDurationMs(entry.startTime, entry.endTime, now);
    return {
      id: entry.id,
      employeeId: entry.employeeId,
      taskDescription: entry.taskDescription,
      startTime: entry.startTime.toISOString(),
      endTime: entry.endTime ? entry.endTime.toISOString() : null,
      isActive: entry.endTime === null,
      durationMs,
      formattedDuration: entry.endTime === null ? "В процессе" : formatDurationEntry(durationMs),
      employee: entry.employee,
    };
  });
}

export async function generateReport(
  rawQuery: Record<string, string | undefined>,
  db: PrismaClient = defaultPrisma,
  now: Date = new Date()
): Promise<PeriodReportResult> {
  const query = validateWithZod(reportsQuerySchema, rawQuery);
  const { periodStart, periodEnd } = parsePeriodRange(
    query.start,
    query.end,
    query.tzOffset ?? 0
  );

  const where: Prisma.TimeEntryWhereInput = {
    startTime: { lt: periodEnd },
    OR: [{ endTime: null }, { endTime: { gt: periodStart } }],
    ...(query.employeeId ? { employeeId: query.employeeId } : {}),
  };

  const entries = await db.timeEntry.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          position: true,
          isActive: true,
        },
      },
    },
    orderBy: { startTime: "desc" },
  });

  return buildPeriodReport(entries, periodStart, periodEnd, now);
}
