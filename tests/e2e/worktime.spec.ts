import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://worktime:worktime_secret@localhost:5432/worktime_test_db?schema=public";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL,
    },
  },
});

test.describe("WorkTime E2E: основные пользовательские сценарии", () => {
  test.beforeAll(async () => {
    await prisma.timeEntry.deleteMany();
    await prisma.employee.deleteMany();
  });

  test.afterAll(async () => {
    await prisma.timeEntry.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.$disconnect();
  });

  test("полный цикл: создание сотрудника, старт, блокировка повторного старта, сохранение при перезагрузке, стоп и отчёты", async ({
    page,
  }) => {
    // 1. Создание сотрудника
    await page.goto("/employees");
    await page.getByTestId("employee-name-input").fill("Виктор Громов");
    await page.getByTestId("employee-position-input").fill("Ведущий инженер");
    await page
      .getByTestId("employee-email-input")
      .fill("viktor.gromov@example.com");
    await page.getByTestId("employee-submit-button").click();

    await expect(page.getByTestId("employee-form-success")).toContainText(
      "Виктор Громов"
    );
    await expect(page.getByTestId("employees-table")).toContainText(
      "Виктор Громов"
    );

    // 2. Запуск таймера для задачи
    await page.goto("/time-tracking");
    await expect(page.getByTestId("timer-employee-select")).toContainText(
      "Виктор Громов"
    );
    await page
      .getByTestId("timer-task-input")
      .fill("Разработка модуля аналитики и отчётов");
    await page.getByTestId("timer-start-button").click();

    await expect(page.getByTestId("active-timer-clock")).toBeVisible();
    await expect(page.getByTestId("active-timer-task")).toHaveText(
      "Разработка модуля аналитики и отчётов"
    );

    // 8. Проверка сохранения активного таймера после перезагрузки страницы
    await page.reload();
    await expect(page.getByTestId("active-timer-clock")).toBeVisible();
    await expect(page.getByTestId("active-timer-task")).toHaveText(
      "Разработка модуля аналитики и отчётов"
    );

    // 3. Проверка отклонения повторного запуска таймера для того же сотрудника
    await page
      .getByTestId("timer-task-input")
      .fill("Попытка параллельной задачи");
    await page.getByTestId("timer-start-button").click();

    await expect(page.getByTestId("timer-error")).toContainText(
      "У сотрудника уже запущен активный таймер"
    );

    // Небольшая пауза, чтобы длительность составила > 1 секунды
    await page.waitForTimeout(1100);

    // 4. Остановка таймера
    await page.getByTestId("timer-stop-button").click();
    await expect(page.getByTestId("no-active-timers")).toBeVisible();

    // 5. Появление завершённой записи в списке
    const entriesTable = page.getByTestId("time-entries-table");
    await expect(entriesTable).toContainText("Виктор Громов");
    await expect(entriesTable).toContainText(
      "Разработка модуля аналитики и отчётов"
    );
    await expect(entriesTable).not.toContainText("В процессе");

    // 6. Отображение отчёта за выбранный период (текущий диапазон включает сегодня)
    await page.goto("/reports");
    const reportTable = page.getByTestId("report-employees-table");
    await expect(reportTable).toBeVisible();
    await expect(reportTable).toContainText("Виктор Громов");
    await expect(page.getByTestId("report-total-tasks")).toHaveText("1");
    await expect(page.getByTestId("report-total-duration")).toContainText("ч");
    await expect(page.getByTestId("report-total-duration")).toContainText(
      "мин"
    );

    // 7. Проверка пустого состояния (empty state) за период без записей
    await page.getByTestId("report-start-date").fill("2020-01-01");
    await page.getByTestId("report-end-date").fill("2020-01-05");
    await page.getByTestId("report-submit-button").click();

    await expect(page.getByTestId("report-empty-state")).toHaveText(
      "За выбранный период записей нет"
    );
  });
});
