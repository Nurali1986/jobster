import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  createEmployee,
  generateReport,
  startTimer,
  stopTimer,
  updateEmployee,
} from "@/lib/services";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://worktime:worktime_secret@localhost:5432/worktime_test_db?schema=public";

const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL,
    },
  },
});

describe("Integration: Сотрудники, таймер, ограничения БД и отчёты", () => {
  beforeEach(async () => {
    await testPrisma.timeEntry.deleteMany();
    await testPrisma.employee.deleteMany();
  });

  afterAll(async () => {
    await testPrisma.timeEntry.deleteMany();
    await testPrisma.employee.deleteMany();
    await testPrisma.$disconnect();
  });

  it("создаёт сотрудника и отклоняет дублирующийся email (409 Conflict)", async () => {
    const emp = await createEmployee(
      {
        name: "Алексей Морозов",
        position: "Инженер",
        email: "alexey.morozov@example.com",
      },
      testPrisma
    );

    expect(emp.id).toBeDefined();
    expect(emp.name).toBe("Алексей Морозов");
    expect(emp.isActive).toBe(true);

    await expect(
      createEmployee(
        {
          name: "Другой Сотрудник",
          email: "ALEXEY.MOROZOV@example.com",
        },
        testPrisma
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("запускает и останавливает таймер, а также безопасно отклоняет повторную остановку", async () => {
    const emp = await createEmployee(
      { name: "Мария Соколова", position: "Дизайнер" },
      testPrisma
    );

    const started = await startTimer(
      {
        employeeId: emp.id,
        taskDescription: "Подготовка макетов главной страницы",
      },
      testPrisma
    );

    expect(started.isActive).toBe(true);
    expect(started.endTime).toBeNull();

    const stopped = await stopTimer(
      { timeEntryId: started.id },
      testPrisma
    );

    expect(stopped.isActive).toBe(false);
    expect(stopped.endTime).not.toBeNull();
    expect(stopped.durationMs).toBeGreaterThanOrEqual(1);

    // Повторная остановка уже остановленного таймера должна вернуть 409 Conflict
    await expect(
      stopTimer({ timeEntryId: started.id }, testPrisma)
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("предотвращает создание второго активного таймера при параллельных start-запросах", async () => {
    const emp = await createEmployee(
      { name: "Сергей Новиков", position: "Бэкенд-разработчик" },
      testPrisma
    );

    const results = await Promise.allSettled([
      startTimer(
        { employeeId: emp.id, taskDescription: "Задача 1 (параллельный старт)" },
        testPrisma
      ),
      startTimer(
        { employeeId: emp.id, taskDescription: "Задача 2 (параллельный старт)" },
        testPrisma
      ),
      startTimer(
        { employeeId: emp.id, taskDescription: "Задача 3 (параллельный старт)" },
        testPrisma
      ),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(2);

    const activeCount = await testPrisma.timeEntry.count({
      where: { employeeId: emp.id, endTime: null },
    });
    expect(activeCount).toBe(1);
  });

  it("защищает целостность на уровне PostgreSQL (partial unique index при прямом INSERT)", async () => {
    const emp = await createEmployee(
      { name: "Ольга Кузнецова", position: "QA" },
      testPrisma
    );

    await testPrisma.timeEntry.create({
      data: {
        employeeId: emp.id,
        taskDescription: "Первая активная запись",
        startTime: new Date(),
        endTime: null,
      },
    });

    // Прямая вставка второй записи с endTime = null в обход бизнес-логики должна быть заблокирована PostgreSQL
    await expect(
      testPrisma.timeEntry.create({
        data: {
          employeeId: emp.id,
          taskDescription: "Вторая активная запись в обход сервиса",
          startTime: new Date(),
          endTime: null,
        },
      })
    ).rejects.toThrow();
  });

  it("возвращает 404 для несуществующего сотрудника и блокирует старт для деактивированного", async () => {
    await expect(
      startTimer(
        {
          employeeId: "00000000-0000-0000-0000-000000000000",
          taskDescription: "Проверка несуществующего ID",
        },
        testPrisma
      )
    ).rejects.toBeInstanceOf(NotFoundError);

    const emp = await createEmployee({ name: "Павел Орлов" }, testPrisma);
    const entry = await startTimer(
      { employeeId: emp.id, taskDescription: "Историческая задача" },
      testPrisma
    );
    await stopTimer({ timeEntryId: entry.id }, testPrisma);

    // Деактивируем сотрудника
    const deactivated = await updateEmployee(
      emp.id,
      { isActive: false },
      testPrisma
    );
    expect(deactivated.isActive).toBe(false);
    expect(deactivated.totalEntriesCount).toBe(1);

    // Деактивированный сотрудник не может начать новый таймер
    await expect(
      startTimer(
        { employeeId: emp.id, taskDescription: "Новая задача после деактивации" },
        testPrisma
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("проверяет некорректный диапазон дат (400) и корректно возвращает пустой отчёт", async () => {
    await expect(
      generateReport(
        {
          start: "2026-10-28",
          end: "2026-10-20",
        },
        testPrisma
      )
    ).rejects.toBeInstanceOf(ValidationError);

    const emptyReport = await generateReport(
      {
        start: "2020-01-01",
        end: "2020-01-05",
      },
      testPrisma
    );

    expect(emptyReport.employees).toEqual([]);
    expect(emptyReport.totalDurationMs).toBe(0);
    expect(emptyReport.formattedTotalDuration).toBe("0 ч 0 мин");
  });
});
