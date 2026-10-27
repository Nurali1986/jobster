import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Запуск заполнения базы демонстрационными (вымышленными) данными...");

  const anna = await prisma.employee.upsert({
    where: { email: "anna.smirnova@example.com" },
    update: {},
    create: {
      name: "Анна Смирнова",
      email: "anna.smirnova@example.com",
      position: "Ведущий фронтенд-разработчик",
      isActive: true,
    },
  });

  const dmitry = await prisma.employee.upsert({
    where: { email: "dmitry.volkov@example.com" },
    update: {},
    create: {
      name: "Дмитрий Волков",
      email: "dmitry.volkov@example.com",
      position: "Бэкенд-разработчик",
      isActive: true,
    },
  });

  const elena = await prisma.employee.upsert({
    where: { email: "elena.morozova@example.com" },
    update: {},
    create: {
      name: "Елена Морозова",
      email: "elena.morozova@example.com",
      position: "Инженер по тестированию (QA)",
      isActive: true,
    },
  });

  await prisma.employee.upsert({
    where: { email: "igor.sokolov@example.com" },
    update: {},
    create: {
      name: "Игорь Соколов",
      email: "igor.sokolov@example.com",
      position: "Системный аналитик",
      isActive: false,
    },
  });

  const existingEntriesCount = await prisma.timeEntry.count();
  if (existingEntriesCount === 0) {
    const now = new Date();
    const todayMorning = new Date(now.getTime() - 4 * 3600 * 1000);
    const todayNoon = new Date(now.getTime() - 2 * 3600 * 1000);
    const yesterdayStart = new Date(now.getTime() - 28 * 3600 * 1000);
    const yesterdayEnd = new Date(now.getTime() - 25 * 3600 * 1000);

    await prisma.timeEntry.createMany({
      data: [
        {
          employeeId: anna.id,
          taskDescription: "Проектирование компонентов панели управления",
          startTime: yesterdayStart,
          endTime: yesterdayEnd,
        },
        {
          employeeId: anna.id,
          taskDescription: "Вёрстка таблицы отчётов и фильтров по периоду",
          startTime: todayMorning,
          endTime: todayNoon,
        },
        {
          employeeId: dmitry.id,
          taskDescription: "Настройка миграций Prisma и индексов PostgreSQL",
          startTime: yesterdayStart,
          endTime: yesterdayEnd,
        },
        {
          employeeId: elena.id,
          taskDescription: "Написание E2E-сценариев для проверки таймера",
          startTime: new Date(now.getTime() - 90 * 60 * 1000),
          endTime: new Date(now.getTime() - 15 * 60 * 1000),
        },
      ],
    });
  }

  console.log("Демонстрационные данные успешно добавлены.");
}

main()
  .catch((error) => {
    console.error("Ошибка при заполнении базы данных:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
