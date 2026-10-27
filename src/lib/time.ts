import { ValidationError } from "./errors";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Разбирает строковые параметры периода и возвращает полуоткрытый интервал [periodStart, periodEnd) в UTC.
 *
 * Правила интерпретации:
 * - Если передана дата в формате YYYY-MM-DD:
 *   - start интерпретируется как начало дня 00:00:00.000Z.
 *   - end интерпретируется как конец выбранного дня (т.е. 00:00:00.000Z следующего дня для интервала [start, end)).
 * - Если передана полная ISO-строка со временем, она используется напрямую как граница интервала [start, end).
 * - periodStart должен быть строго меньше periodEnd.
 */
export function parsePeriodRange(
  startInput?: string | null,
  endInput?: string | null,
  tzOffsetMinutes = 0
): { periodStart: Date; periodEnd: Date } {
  if (!startInput || !endInput) {
    throw new ValidationError("Необходимо указать дату начала (start) и окончания (end) периода.");
  }

  const trimmedStart = startInput.trim();
  const trimmedEnd = endInput.trim();

  let periodStart: Date;
  let periodEnd: Date;

  if (DATE_ONLY_REGEX.test(trimmedStart)) {
    const [year, month, day] = trimmedStart.split("-").map(Number);
    const utcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) + tzOffsetMinutes * 60_000;
    periodStart = new Date(utcMs);
    if (
      periodStart.getUTCFullYear() !== year &&
      tzOffsetMinutes === 0
    ) {
      throw new ValidationError("Некорректная дата начала периода.");
    }
  } else {
    periodStart = new Date(trimmedStart);
  }

  if (DATE_ONLY_REGEX.test(trimmedEnd)) {
    const [year, month, day] = trimmedEnd.split("-").map(Number);
    // Для полуоткрытого интервала [start, end) дата YYYY-MM-DD включает весь день до 00:00 следующего дня
    const utcMs = Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0) + tzOffsetMinutes * 60_000;
    periodEnd = new Date(utcMs);
  } else {
    periodEnd = new Date(trimmedEnd);
  }

  if (Number.isNaN(periodStart.getTime())) {
    throw new ValidationError("Некорректный формат даты начала периода (start).");
  }

  if (Number.isNaN(periodEnd.getTime())) {
    throw new ValidationError("Некорректный формат даты окончания периода (end).");
  }

  if (periodStart.getTime() >= periodEnd.getTime()) {
    throw new ValidationError("Дата начала периода должна быть раньше даты окончания.");
  }

  return { periodStart, periodEnd };
}

/**
 * Разбирает опциональные границы фильтрации [start, end) для списка записей.
 */
export function parseOptionalDateFilter(
  startInput?: string | null,
  endInput?: string | null,
  tzOffsetMinutes = 0
): { periodStart?: Date; periodEnd?: Date } {
  let periodStart: Date | undefined;
  let periodEnd: Date | undefined;

  if (startInput && startInput.trim() !== "") {
    const s = startInput.trim();
    if (DATE_ONLY_REGEX.test(s)) {
      const [year, month, day] = s.split("-").map(Number);
      periodStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) + tzOffsetMinutes * 60_000);
    } else {
      periodStart = new Date(s);
    }
    if (Number.isNaN(periodStart.getTime())) {
      throw new ValidationError("Некорректный формат начальной даты фильтра.");
    }
  }

  if (endInput && endInput.trim() !== "") {
    const e = endInput.trim();
    if (DATE_ONLY_REGEX.test(e)) {
      const [year, month, day] = e.split("-").map(Number);
      periodEnd = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0) + tzOffsetMinutes * 60_000);
    } else {
      periodEnd = new Date(e);
    }
    if (Number.isNaN(periodEnd.getTime())) {
      throw new ValidationError("Некорректный формат конечной даты фильтра.");
    }
  }

  if (periodStart && periodEnd && periodStart.getTime() >= periodEnd.getTime()) {
    throw new ValidationError("Начало периода фильтрации должно быть раньше окончания.");
  }

  return { periodStart, periodEnd };
}

/**
 * Вычисляет полную длительность записи в миллисекундах (не может быть отрицательной).
 */
export function calculateEntryDurationMs(
  startTime: Date | string,
  endTime: Date | string | null,
  now: Date = new Date()
): number {
  const startMs = typeof startTime === "string" ? new Date(startTime).getTime() : startTime.getTime();
  const endMs =
    endTime === null
      ? now.getTime()
      : typeof endTime === "string"
        ? new Date(endTime).getTime()
        : endTime.getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return 0;
  }

  return Math.max(0, endMs - startMs);
}

/**
 * Вычисляет длительность записи, пересекающейся с полуоткрытым периодом [periodStart, periodEnd):
 * effectiveStart = max(startTime, periodStart)
 * effectiveEnd = min(endTime ?? now, periodEnd)
 * duration = max(0, effectiveEnd - effectiveStart)
 */
export function calculateClampedDurationMs(
  startTime: Date | string,
  endTime: Date | string | null,
  periodStart: Date,
  periodEnd: Date,
  now: Date = new Date()
): number {
  const startMs = typeof startTime === "string" ? new Date(startTime).getTime() : startTime.getTime();
  const rawEndMs =
    endTime === null
      ? now.getTime()
      : typeof endTime === "string"
        ? new Date(endTime).getTime()
        : endTime.getTime();

  const effectiveStart = Math.max(startMs, periodStart.getTime());
  const effectiveEnd = Math.min(rawEndMs, periodEnd.getTime());

  return Math.max(0, effectiveEnd - effectiveStart);
}

/**
 * Проверяет, пересекается ли запись с полуоткрытым интервалом [periodStart, periodEnd).
 */
export function doesEntryOverlapPeriod(
  startTime: Date | string,
  endTime: Date | string | null,
  periodStart: Date,
  periodEnd: Date,
  now: Date = new Date()
): boolean {
  return calculateClampedDurationMs(startTime, endTime, periodStart, periodEnd, now) > 0;
}

/**
 * Форматирует длительность для работающего секундомера в формат HH:MM:SS.
 */
export function formatDurationTimer(durationMs: number): string {
  const safeMs = Math.max(0, Math.floor(durationMs));
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");
}

/**
 * Форматирует длительность для отчётов и сводок в понятный формат: "12 ч 35 мин".
 */
export function formatDurationHuman(durationMs: number): string {
  const safeMs = Math.max(0, Math.floor(durationMs));
  const totalMinutes = Math.floor(safeMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours} ч ${minutes} мин`;
}

/**
 * Форматирует длительность для списка записей: если меньше минуты и > 0 сек, показывает секунды наряду с часами/минутами.
 */
export function formatDurationEntry(durationMs: number): string {
  const safeMs = Math.max(0, Math.floor(durationMs));
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours === 0 && minutes === 0 && seconds > 0) {
    return `0 ч 0 мин (${seconds} сек)`;
  }

  return `${hours} ч ${minutes} мин`;
}

export interface ReportEntryInput {
  id: string;
  employeeId: string;
  taskDescription: string;
  startTime: Date;
  endTime: Date | null;
  employee: {
    id: string;
    name: string;
    email: string | null;
    position: string | null;
    isActive: boolean;
  };
}

export interface EmployeeReportItem {
  employeeId: string;
  employeeName: string;
  employeeEmail: string | null;
  employeePosition: string | null;
  isActive: boolean;
  tasksCount: number;
  totalDurationMs: number;
  formattedDuration: string;
  entries: {
    id: string;
    taskDescription: string;
    startTime: string;
    endTime: string | null;
    isActive: boolean;
    clampedDurationMs: number;
    formattedDuration: string;
  }[];
}

export interface PeriodReportResult {
  periodStart: string;
  periodEnd: string;
  totalDurationMs: number;
  formattedTotalDuration: string;
  totalTasksCount: number;
  employeesCount: number;
  employees: EmployeeReportItem[];
}

/**
 * Строит агрегированный отчёт по сотрудникам за период [periodStart, periodEnd).
 */
export function buildPeriodReport(
  entries: ReportEntryInput[],
  periodStart: Date,
  periodEnd: Date,
  now: Date = new Date()
): PeriodReportResult {
  const employeeMap = new Map<string, EmployeeReportItem>();
  let totalDurationMs = 0;
  let totalTasksCount = 0;

  for (const entry of entries) {
    const clampedMs = calculateClampedDurationMs(
      entry.startTime,
      entry.endTime,
      periodStart,
      periodEnd,
      now
    );

    if (clampedMs <= 0) {
      continue;
    }

    totalDurationMs += clampedMs;
    totalTasksCount += 1;

    let empGroup = employeeMap.get(entry.employeeId);
    if (!empGroup) {
      empGroup = {
        employeeId: entry.employee.id,
        employeeName: entry.employee.name,
        employeeEmail: entry.employee.email,
        employeePosition: entry.employee.position,
        isActive: entry.employee.isActive,
        tasksCount: 0,
        totalDurationMs: 0,
        formattedDuration: "0 ч 0 мин",
        entries: [],
      };
      employeeMap.set(entry.employeeId, empGroup);
    }

    empGroup.tasksCount += 1;
    empGroup.totalDurationMs += clampedMs;
    empGroup.formattedDuration = formatDurationHuman(empGroup.totalDurationMs);
    empGroup.entries.push({
      id: entry.id,
      taskDescription: entry.taskDescription,
      startTime: entry.startTime.toISOString(),
      endTime: entry.endTime ? entry.endTime.toISOString() : null,
      isActive: entry.endTime === null,
      clampedDurationMs: clampedMs,
      formattedDuration: formatDurationHuman(clampedMs),
    });
  }

  const employees = Array.from(employeeMap.values()).sort(
    (a, b) => b.totalDurationMs - a.totalDurationMs || a.employeeName.localeCompare(b.employeeName, "ru")
  );

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    totalDurationMs,
    formattedTotalDuration: formatDurationHuman(totalDurationMs),
    totalTasksCount,
    employeesCount: employees.length,
    employees,
  };
}
