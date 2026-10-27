/**
 * Форматирует ISO-дату (UTC) в локальное дата-время пользователя на русском языке.
 */
export function formatLocalDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

/**
 * Возвращает локальную дату YYYY-MM-DD для полей <input type="date" />.
 */
export function getLocalTodayDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Возвращает дату N дней назад в формате YYYY-MM-DD (по локальному времени).
 */
export function getLocalDaysAgoDateString(daysAgo: number, baseDate: Date = new Date()): string {
  const copy = new Date(baseDate.getTime());
  copy.setDate(copy.getDate() - daysAgo);
  return getLocalTodayDateString(copy);
}
