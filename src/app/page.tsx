"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Users,
  Play,
  Square,
  PlusCircle,
  ArrowRight,
  AlertCircle,
  Timer,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LiveTimer } from "@/components/live-timer";
import {
  formatLocalDateTime,
  getLocalTodayDateString,
} from "@/lib/client-date";

interface EmployeeItem {
  id: string;
  name: string;
  email: string | null;
  position: string | null;
  isActive: boolean;
  activeTimer: {
    id: string;
    taskDescription: string;
    startTime: string;
  } | null;
}

interface TimeEntryItem {
  id: string;
  employeeId: string;
  taskDescription: string;
  startTime: string;
  endTime: string | null;
  isActive: boolean;
  durationMs: number;
  formattedDuration: string;
  employee: {
    id: string;
    name: string;
    position: string | null;
  };
}

export default function DashboardPage() {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [recentEntries, setRecentEntries] = useState<TimeEntryItem[]>([]);
  const [todayWorkedFormatted, setTodayWorkedFormatted] =
    useState<string>("0 ч 0 мин");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Quick timer state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [taskDescription, setTaskDescription] = useState<string>("");
  const [timerError, setTimerError] = useState<string | null>(null);
  const [submittingTimer, setSubmittingTimer] = useState<boolean>(false);

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      const today = getLocalTodayDateString();
      const tzOffset = new Date().getTimezoneOffset();

      const [empRes, entriesRes, reportRes] = await Promise.all([
        fetch("/api/employees", { cache: "no-store" }),
        fetch("/api/time-entries?limit=10", { cache: "no-store" }),
        fetch(
          `/api/reports?start=${encodeURIComponent(today)}&end=${encodeURIComponent(today)}&tzOffset=${tzOffset}`,
          { cache: "no-store" }
        ),
      ]);

      if (!empRes.ok || !entriesRes.ok || !reportRes.ok) {
        throw new Error("Не удалось загрузить данные обзора.");
      }

      const empData = await empRes.json();
      const entriesData = await entriesRes.json();
      const reportData = await reportRes.json();

      const loadedEmployees: EmployeeItem[] = empData.employees ?? [];
      setEmployees(loadedEmployees);
      setRecentEntries(entriesData.timeEntries ?? []);
      setTodayWorkedFormatted(
        reportData.report?.formattedTotalDuration ?? "0 ч 0 мин"
      );

      setSelectedEmployeeId((prev) => {
        if (prev && loadedEmployees.some((e) => e.id === prev && e.isActive)) {
          return prev;
        }
        const firstActive = loadedEmployees.find((e) => e.isActive);
        return firstActive ? firstActive.id : "";
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка при загрузке данных."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const activeEmployees = employees.filter((e) => e.isActive);
  const activeTimers = recentEntries.filter((e) => e.isActive);

  async function handleQuickStart(e: React.FormEvent) {
    e.preventDefault();
    setTimerError(null);
    setSubmittingTimer(true);
    try {
      const res = await fetch("/api/timer/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          taskDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTimerError(data.error ?? "Не удалось запустить таймер.");
        return;
      }
      setTaskDescription("");
      await loadDashboardData();
    } catch {
      setTimerError("Ошибка сети при запуске таймера.");
    } finally {
      setSubmittingTimer(false);
    }
  }

  async function handleStopTimer(timeEntryId: string) {
    setTimerError(null);
    setSubmittingTimer(true);
    try {
      const res = await fetch("/api/timer/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeEntryId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTimerError(data.error ?? "Не удалось остановить таймер.");
        return;
      }
      await loadDashboardData();
    } catch {
      setTimerError("Ошибка сети при остановке таймера.");
    } finally {
      setSubmittingTimer(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Обзор
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Сводка рабочего времени и текущая активность сотрудников
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/employees">
              <PlusCircle className="h-4 w-4 mr-2" />
              Сотрудники
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/time-tracking">
              <Clock className="h-4 w-4 mr-2" />
              Управление таймером
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Сегодня отработано</span>
              <Clock className="h-4 w-4 text-slate-400" />
            </CardDescription>
            <CardTitle
              data-testid="metric-today-worked"
              className="text-2xl font-bold text-slate-900"
            >
              {loading ? "..." : todayWorkedFormatted}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">
              Суммарное время за текущие сутки
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Количество активных сотрудников</span>
              <Users className="h-4 w-4 text-slate-400" />
            </CardDescription>
            <CardTitle
              data-testid="metric-active-employees"
              className="text-2xl font-bold text-slate-900"
            >
              {loading ? "..." : activeEmployees.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">
              Всего в базе: {employees.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Активные таймеры</span>
              <Timer className="h-4 w-4 text-emerald-600" />
            </CardDescription>
            <CardTitle
              data-testid="metric-active-timers"
              className="text-2xl font-bold text-slate-900"
            >
              {loading ? "..." : activeTimers.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">
              Выполняются прямо сейчас
            </p>
          </CardContent>
        </Card>
      </div>

      {/* First-Time Empty State */}
      {!loading && employees.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-300 bg-white">
          <CardContent className="py-12 flex flex-col items-center text-center max-w-md mx-auto space-y-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
              <Users className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">
                В системе пока нет сотрудников
              </h2>
              <p className="text-sm text-slate-500">
                Добавьте первого сотрудника, чтобы запускать таймер задач,
                вести учёт рабочего времени и формировать отчёты за период.
              </p>
            </div>
            <Button asChild>
              <Link href="/employees" data-testid="empty-state-add-employee">
                <PlusCircle className="h-4 w-4 mr-2" />
                Добавить первого сотрудника
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Timer Launch */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Быстрый запуск таймера</CardTitle>
              <CardDescription>
                Выберите сотрудника и укажите текущую задачу
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleQuickStart} className="space-y-4">
                {timerError && (
                  <div
                    role="alert"
                    className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                  >
                    {timerError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="dashboard-employee-select">Сотрудник</Label>
                  <select
                    id="dashboard-employee-select"
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    disabled={activeEmployees.length === 0}
                  >
                    {activeEmployees.length === 0 ? (
                      <option value="">Нет активных сотрудников</option>
                    ) : (
                      activeEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                          {emp.position ? ` (${emp.position})` : ""}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dashboard-task-input">Описание задачи</Label>
                  <Input
                    id="dashboard-task-input"
                    placeholder="Например: Разработка API отчётов"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submittingTimer || activeEmployees.length === 0}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Начать работу
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Active Timers Panel */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Активные таймеры</CardTitle>
                <CardDescription>
                  Задачи, выполняемые сотрудниками в данный момент
                </CardDescription>
              </div>
              <Badge variant={activeTimers.length > 0 ? "success" : "secondary"}>
                {activeTimers.length} активн.
              </Badge>
            </CardHeader>
            <CardContent>
              {activeTimers.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  Сейчас нет запущенных таймеров. Выберите сотрудника слева или
                  перейдите в раздел «Учёт времени», чтобы начать работу.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeTimers.map((timer) => (
                    <div
                      key={timer.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900">
                            {timer.employee.name}
                          </span>
                          <Badge variant="success">В процессе</Badge>
                        </div>
                        <p className="text-sm text-slate-700">
                          {timer.taskDescription}
                        </p>
                        <p className="text-xs text-slate-500">
                          Начало: {formatLocalDateTime(timer.startTime)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <LiveTimer
                          startTime={timer.startTime}
                          className="font-mono text-lg font-bold text-emerald-700 tabular-nums"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleStopTimer(timer.id)}
                          disabled={submittingTimer}
                        >
                          <Square className="h-3.5 w-3.5 mr-1.5" />
                          Остановить
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Time Entries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Последние записи</CardTitle>
            <CardDescription>
              Недавняя активность по задачам сотрудников
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/time-tracking">
              Все записи
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Записей о рабочем времени пока нет.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Задача</TableHead>
                  <TableHead>Начало</TableHead>
                  <TableHead>Окончание</TableHead>
                  <TableHead className="text-right">Длительность</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.employee.name}
                    </TableCell>
                    <TableCell>{entry.taskDescription}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-600">
                      {formatLocalDateTime(entry.startTime)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-600">
                      {entry.endTime
                        ? formatLocalDateTime(entry.endTime)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {entry.isActive ? (
                        <Badge variant="success">В процессе</Badge>
                      ) : (
                        <span className="font-medium text-slate-800">
                          {entry.formattedDuration}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
