import { describe, expect, it } from "vitest";
import {
  buildPeriodReport,
  calculateClampedDurationMs,
  calculateEntryDurationMs,
  doesEntryOverlapPeriod,
  formatDurationEntry,
  formatDurationHuman,
  formatDurationTimer,
  parsePeriodRange,
} from "@/lib/time";

describe("Unit: Форматирование длительности", () => {
  it("корректно форматирует секундомер в HH:MM:SS", () => {
    expect(formatDurationTimer(0)).toBe("00:00:00");
    expect(formatDurationTimer(59_000)).toBe("00:00:59");
    expect(formatDurationTimer(65_000)).toBe("00:01:05");
    expect(formatDurationTimer((12 * 3600 + 35 * 60 + 9) * 1000)).toBe("12:35:09");
  });

  it("корректно форматирует длительность для отчётов в 'X ч Y мин'", () => {
    expect(formatDurationHuman(0)).toBe("0 ч 0 мин");
    expect(formatDurationHuman((12 * 60 + 35) * 60_000)).toBe("12 ч 35 мин");
    expect(formatDurationHuman(45 * 60_000)).toBe("0 ч 45 мин");
    expect(formatDurationHuman(-5000)).toBe("0 ч 0 мин");
  });

  it("корректно форматирует короткие записи меньше минуты", () => {
    expect(formatDurationEntry(15_000)).toBe("0 ч 0 мин (15 сек)");
    expect(formatDurationEntry(120_000)).toBe("0 ч 2 мин");
  });
});

describe("Unit: Начало/окончание и разбор интервала [start, end)", () => {
  it("вычисляет длительность завершённой записи и не допускает отрицательных значений", () => {
    const start = new Date("2026-10-27T08:00:00.000Z");
    const end = new Date("2026-10-27T10:30:00.000Z");
    expect(calculateEntryDurationMs(start, end)).toBe(2.5 * 3600 * 1000);

    // Если end раньше start, возвращает 0 (защита от отрицательной длительности)
    expect(calculateEntryDurationMs(end, start)).toBe(0);
  });

  it("преобразует даты YYYY-MM-DD в полуоткрытый интервал [start, end)", () => {
    const { periodStart, periodEnd } = parsePeriodRange("2026-10-27", "2026-10-27");
    expect(periodStart.toISOString()).toBe("2026-10-27T00:00:00.000Z");
    expect(periodEnd.toISOString()).toBe("2026-10-28T00:00:00.000Z");
  });

  it("выбрасывает ошибку, если начало периода больше или равно окончанию", () => {
    expect(() =>
      parsePeriodRange("2026-10-28T00:00:00.000Z", "2026-10-27T00:00:00.000Z")
    ).toThrow(/Дата начала периода должна быть раньше даты окончания/);

    expect(() =>
      parsePeriodRange("2026-10-27T12:00:00.000Z", "2026-10-27T12:00:00.000Z")
    ).toThrow(/Дата начала периода должна быть раньше даты окончания/);
  });
});

describe("Unit: Пересечение с периодом и обрезка по границам (clamping)", () => {
  const periodStart = new Date("2026-10-27T00:00:00.000Z");
  const periodEnd = new Date("2026-10-28T00:00:00.000Z");

  it("учитывает только часть записи, пересекающуюся с началом периода", () => {
    // Началась 26 октября в 22:00, закончилась 27 октября в 02:00 -> в периоде 27 октября только 2 часа
    const start = new Date("2026-10-26T22:00:00.000Z");
    const end = new Date("2026-10-27T02:00:00.000Z");

    const clamped = calculateClampedDurationMs(start, end, periodStart, periodEnd);
    expect(clamped).toBe(2 * 3600 * 1000);
    expect(doesEntryOverlapPeriod(start, end, periodStart, periodEnd)).toBe(true);
  });

  it("учитывает только часть записи, пересекающуюся с концом периода", () => {
    // Началась 27 октября в 23:00, закончилась 28 октября в 03:00 -> в периоде 27 октября только 1 час
    const start = new Date("2026-10-27T23:00:00.000Z");
    const end = new Date("2026-10-28T03:00:00.000Z");

    const clamped = calculateClampedDurationMs(start, end, periodStart, periodEnd);
    expect(clamped).toBe(1 * 3600 * 1000);
  });

  it("возвращает 0 для записей вне выбранного периода", () => {
    const start = new Date("2026-10-25T10:00:00.000Z");
    const end = new Date("2026-10-25T12:00:00.000Z");

    expect(calculateClampedDurationMs(start, end, periodStart, periodEnd)).toBe(0);
    expect(doesEntryOverlapPeriod(start, end, periodStart, periodEnd)).toBe(false);
  });
});

describe("Unit: Длительность активного таймера и пустой отчёт", () => {
  it("ограничивает длительность активного таймера текущим моментом или концом периода", () => {
    const periodStart = new Date("2026-10-27T00:00:00.000Z");
    const periodEnd = new Date("2026-10-28T00:00:00.000Z");
    const start = new Date("2026-10-27T10:00:00.000Z");
    const nowInside = new Date("2026-10-27T11:30:00.000Z");

    // Если now внутри периода -> считает до now (1.5 часа)
    expect(calculateClampedDurationMs(start, null, periodStart, periodEnd, nowInside)).toBe(
      1.5 * 3600 * 1000
    );

    // Если now за пределами периода -> обрезает по periodEnd (14 часов)
    const nowAfter = new Date("2026-10-29T12:00:00.000Z");
    expect(calculateClampedDurationMs(start, null, periodStart, periodEnd, nowAfter)).toBe(
      14 * 3600 * 1000
    );
  });

  it("формирует корректный пустой отчёт без ошибок при отсутствии записей", () => {
    const periodStart = new Date("2025-01-01T00:00:00.000Z");
    const periodEnd = new Date("2025-01-02T00:00:00.000Z");
    const report = buildPeriodReport([], periodStart, periodEnd);

    expect(report.employees).toEqual([]);
    expect(report.employeesCount).toBe(0);
    expect(report.totalTasksCount).toBe(0);
    expect(report.totalDurationMs).toBe(0);
    expect(report.formattedTotalDuration).toBe("0 ч 0 мин");
  });
});
