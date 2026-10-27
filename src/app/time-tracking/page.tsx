"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Play,
  Square,
  Clock,
  Filter,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LiveTimer } from "@/components/live-timer";
import { formatLocalDateTime } from "@/lib/client-date";

interface EmployeeOption {
  id: string;
  name: string;
  position: string | null;
  isActive: boolean;
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
    isActive: boolean;
  };
}

export default function TimeTrackingPage() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [entries, setEntries] = useState<TimeEntryItem[]>([]);
  const [activeTimers, setActiveTimers] = useState<TimeEntryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Timer form state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [taskDescription, setTaskDescription] = useState<string>("");
  const [timerError, setTimerError] = useState<string | null>(null);
  const [timerSuccess, setTimerSuccess] = useState<string | null>(null);
  const [submittingTimer, setSubmittingTimer] = useState<boolean>(false);

  // Filter state for Time Entries list
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [filterError, setFilterError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setFilterError(null);

      const queryParams = new URLSearchParams();
      if (filterEmployeeId) queryParams.set("employeeId", filterEmployeeId);
      if (filterStartDate) queryParams.set("start", filterStartDate);
      if (filterEndDate) queryParams.set("end", filterEndDate);
      queryParams.set("tzOffset", String(new Date().getTimezoneOffset()));

      const [empRes, entriesRes, activeRes] = await Promise.all([
        fetch("/api/employees", { cache: "no-store" }),
        fetch(`/api/time-entries?${queryParams.toString()}`, {
          cache: "no-store",
        }),
        fetch("/api/time-entries?activeOnly=true", { cache: "no-store" }),
      ]);

      const empData = await empRes.json();
      const entriesData = await entriesRes.json();
      const activeData = await activeRes.json();

      if (!entriesRes.ok) {
        setFilterError(
          entriesData.error ?? "Не удалось отфильтровать записи времени."
        );
      } else {
        setEntries(entriesData.timeEntries ?? []);
      }

      if (activeRes.ok) {
        setActiveTimers(activeData.timeEntries ?? []);
      }

      if (empRes.ok) {
        const list: EmployeeOption[] = empData.employees ?? [];
        setEmployees(list);
        setSelectedEmployeeId((prev) => {
          if (prev && list.some((item) => item.id === prev && item.isActive)) {
            return prev;
          }
          const firstActive = list.find((item) => item.isActive);
          return firstActive ? firstActive.id : "";
        });
      }
    } finally {
      setLoading(false);
    }
  }, [filterEmployeeId, filterStartDate, filterEndDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeEmployees = employees.filter((e) => e.isActive);

  async function handleStartTimer(e: React.FormEvent) {
    e.preventDefault();
    setTimerError(null);
    setTimerSuccess(null);
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
      setTimerSuccess("Таймер успешно запущен.");
      await loadData();
    } catch {
      setTimerError("Ошибка сети при обращении к серверу.");
    } finally {
      setSubmittingTimer(false);
    }
  }

  async function handleStopTimer(timeEntryId: string) {
    setTimerError(null);
    setTimerSuccess(null);
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

      setTimerSuccess("Таймер остановлен, время сохранено.");
      await loadData();
    } catch {
      setTimerError("Ошибка сети при остановке таймера.");
    } finally {
      setSubmittingTimer(false);
    }
  }

  function handleResetFilters() {
    setFilterEmployeeId("");
    setFilterStartDate("");
    setFilterEndDate("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Учёт времени
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Запуск и остановка таймера задач, просмотр и фильтрация рабочего
          времени
        </p>
      </div>

      {/* Timer Control & Active Timers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Start Timer Card */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-700" />
              <span>Запуск таймера</span>
            </CardTitle>
            <CardDescription>
              Выберите сотрудника и опишите выполняемую задачу
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleStartTimer}
              data-testid="timer-start-form"
              className="space-y-4"
            >
              {timerError && (
                <div
                  role="alert"
                  data-testid="timer-error"
                  className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{timerError}</span>
                </div>
              )}

              {timerSuccess && (
                <div
                  data-testid="timer-success"
                  className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{timerSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="timer-employee-select">Сотрудник</Label>
                <select
                  id="timer-employee-select"
                  data-testid="timer-employee-select"
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  disabled={activeEmployees.length === 0}
                >
                  {activeEmployees.length === 0 ? (
                    <option value="">Нет доступных активных сотрудников</option>
                  ) : (
                    activeEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                        {emp.position ? ` — ${emp.position}` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="timer-task-input">Описание задачи</Label>
                <Input
                  id="timer-task-input"
                  data-testid="timer-task-input"
                  placeholder="Что сейчас выполняется?"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                data-testid="timer-start-button"
                className="w-full min-h-[44px]"
                disabled={submittingTimer || activeEmployees.length === 0}
              >
                <Play className="h-4 w-4 mr-2" />
                Начать работу
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Active Timers Card */}
        <Card className="lg:col-span-7" data-testid="active-timers-section">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Активные таймеры</CardTitle>
              <CardDescription>
                Таймеры сохраняются при обновлении страницы и перезапуске
              </CardDescription>
            </div>
            <Badge variant={activeTimers.length > 0 ? "success" : "secondary"}>
              {activeTimers.length} в работе
            </Badge>
          </CardHeader>
          <CardContent>
            {activeTimers.length === 0 ? (
              <div
                data-testid="no-active-timers"
                className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500"
              >
                В данный момент нет активных таймеров.
              </div>
            ) : (
              <div className="space-y-3">
                {activeTimers.map((timer) => (
                  <div
                    key={timer.id}
                    data-testid={`active-timer-card-${timer.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {timer.employee.name}
                        </span>
                        <Badge variant="success">В процессе</Badge>
                      </div>
                      <p
                        data-testid="active-timer-task"
                        className="text-sm font-medium text-slate-800"
                      >
                        {timer.taskDescription}
                      </p>
                      <p className="text-xs text-slate-500">
                        Запущен: {formatLocalDateTime(timer.startTime)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <LiveTimer
                        startTime={timer.startTime}
                        className="font-mono text-2xl font-bold text-emerald-700 tabular-nums"
                      />
                      <Button
                        variant="destructive"
                        size="lg"
                        data-testid="timer-stop-button"
                        className="min-h-[44px]"
                        onClick={() => handleStopTimer(timer.id)}
                        disabled={submittingTimer}
                      >
                        <Square className="h-4 w-4 mr-2" />
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

      {/* Time Entries History & Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-700" />
                <span>Записи рабочего времени</span>
              </CardTitle>
              <CardDescription>
                История выполненных и текущих задач с фильтрацией по периоду и
                сотруднику
              </CardDescription>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="space-y-1">
                <Label htmlFor="entries-filter-employee" className="text-xs">
                  Сотрудник
                </Label>
                <select
                  id="entries-filter-employee"
                  data-testid="entries-filter-employee"
                  value={filterEmployeeId}
                  onChange={(e) => setFilterEmployeeId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">Все сотрудники</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="entries-filter-start" className="text-xs">
                  С даты
                </Label>
                <Input
                  id="entries-filter-start"
                  data-testid="entries-filter-start"
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="entries-filter-end" className="text-xs">
                  По дату
                </Label>
                <Input
                  id="entries-filter-end"
                  data-testid="entries-filter-end"
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleResetFilters}
                className="h-10"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Сбросить
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filterError && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {filterError}
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Загрузка записей...
            </div>
          ) : entries.length === 0 ? (
            <div
              data-testid="time-entries-empty-state"
              className="py-10 text-center text-sm text-slate-500"
            >
              Записи о рабочем времени не найдены.
            </div>
          ) : (
            <Table data-testid="time-entries-table">
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
                {entries.map((entry) => (
                  <TableRow
                    key={entry.id}
                    data-testid={`time-entry-row-${entry.id}`}
                  >
                    <TableCell className="font-medium text-slate-900">
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
