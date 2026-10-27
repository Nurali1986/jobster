"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Calendar,
  Clock,
  CheckSquare,
  Users,
  AlertCircle,
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
import {
  formatLocalDateTime,
  getLocalDaysAgoDateString,
  getLocalTodayDateString,
} from "@/lib/client-date";

interface EmployeeReportItem {
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

interface PeriodReportData {
  periodStart: string;
  periodEnd: string;
  totalDurationMs: number;
  formattedTotalDuration: string;
  totalTasksCount: number;
  employeesCount: number;
  employees: EmployeeReportItem[];
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState<string>(() =>
    getLocalDaysAgoDateString(7)
  );
  const [endDate, setEndDate] = useState<string>(() =>
    getLocalTodayDateString()
  );
  const [report, setReport] = useState<PeriodReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(
    async (startParam: string, endParam: string) => {
      try {
        setLoading(true);
        setError(null);

        const tzOffset = new Date().getTimezoneOffset();
        const params = new URLSearchParams({
          start: startParam,
          end: endParam,
          tzOffset: String(tzOffset),
        });

        const res = await fetch(`/api/reports?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Ошибка при формировании отчёта.");
          setReport(null);
          return;
        }

        setReport(data.report);
      } catch {
        setError("Не удалось подключиться к серверу для получения отчёта.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchReport(startDate, endDate);
  }, [fetchReport, startDate, endDate]);

  function handleApplyPeriod(e: React.FormEvent) {
    e.preventDefault();
    fetchReport(startDate, endDate);
  }

  function applyQuickPreset(daysAgo: number) {
    const start = getLocalDaysAgoDateString(daysAgo);
    const end = getLocalTodayDateString();
    setStartDate(start);
    setEndDate(end);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Отчёты
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Сводка отработанного времени по каждому сотруднику за выбранный период
        </p>
      </div>

      {/* Period Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-700" />
            <span>Параметры периода</span>
          </CardTitle>
          <CardDescription>
            Учитываются все записи, пересекающиеся с выбранным периодом
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleApplyPeriod}
            data-testid="reports-filter-form"
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5">
                <Label htmlFor="report-start-date">Дата начала</Label>
                <Input
                  id="report-start-date"
                  data-testid="report-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="report-end-date">Дата окончания</Label>
                <Input
                  id="report-end-date"
                  data-testid="report-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                data-testid="report-submit-button"
                disabled={loading}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Сформировать отчёт
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-slate-500 mr-1">Быстрый выбор:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyQuickPreset(0)}
              >
                Сегодня
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyQuickPreset(7)}
              >
                Последние 7 дней
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyQuickPreset(30)}
              >
                Последние 30 дней
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <div
          role="alert"
          data-testid="report-error"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Report Summary Metrics */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Общее время за период</span>
                <Clock className="h-4 w-4 text-slate-400" />
              </CardDescription>
              <CardTitle
                data-testid="report-total-duration"
                className="text-2xl font-bold text-slate-900"
              >
                {report.formattedTotalDuration}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500">
                Суммарно по всем сотрудникам
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Количество задач</span>
                <CheckSquare className="h-4 w-4 text-slate-400" />
              </CardDescription>
              <CardTitle
                data-testid="report-total-tasks"
                className="text-2xl font-bold text-slate-900"
              >
                {report.totalTasksCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500">
                Записей времени в выбранном интервале
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Сотрудников в отчёте</span>
                <Users className="h-4 w-4 text-slate-400" />
              </CardDescription>
              <CardTitle
                data-testid="report-employees-count"
                className="text-2xl font-bold text-slate-900"
              >
                {report.employeesCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500">
                Сотрудники с активностью за период
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Employee Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Сводная таблица по сотрудникам
          </CardTitle>
          <CardDescription>
            Детализация отработанного времени и выполненных задач
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Формирование отчёта...
            </div>
          ) : !report || report.employees.length === 0 ? (
            <div
              data-testid="report-empty-state"
              className="py-12 text-center text-sm font-medium text-slate-600"
            >
              За выбранный период записей нет
            </div>
          ) : (
            <div className="space-y-6">
              <Table data-testid="report-employees-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Сотрудник</TableHead>
                    <TableHead>Должность</TableHead>
                    <TableHead className="text-center">
                      Количество задач
                    </TableHead>
                    <TableHead className="text-right">Итоговое время</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.employees.map((item) => (
                    <TableRow
                      key={item.employeeId}
                      data-testid={`report-employee-row-${item.employeeId}`}
                    >
                      <TableCell className="font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{item.employeeName}</span>
                          {!item.isActive && (
                            <Badge variant="secondary">Неактивен</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {item.employeePosition || "—"}
                      </TableCell>
                      <TableCell
                        data-testid={`report-employee-tasks-${item.employeeId}`}
                        className="text-center font-medium"
                      >
                        {item.tasksCount}
                      </TableCell>
                      <TableCell
                        data-testid={`report-employee-duration-${item.employeeId}`}
                        className="text-right font-semibold text-slate-900"
                      >
                        {item.formattedDuration}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Detailed Entries per Employee */}
              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-semibold text-slate-700">
                  Детализация задач по сотрудникам
                </h4>
                {report.employees.map((item) => (
                  <div
                    key={item.employeeId}
                    className="rounded-lg border border-slate-200 p-4 space-y-3 bg-slate-50/40"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm text-slate-900">
                        {item.employeeName}
                      </div>
                      <div className="text-xs font-medium text-slate-600">
                        Задач: {item.tasksCount} • Всего:{" "}
                        <span className="font-semibold text-slate-900">
                          {item.formattedDuration}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {item.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between text-xs bg-white rounded border border-slate-200 px-3 py-2 gap-1"
                        >
                          <div className="font-medium text-slate-800">
                            {entry.taskDescription}
                          </div>
                          <div className="flex items-center gap-3 text-slate-500">
                            <span>
                              {formatLocalDateTime(entry.startTime)} —{" "}
                              {entry.endTime
                                ? formatLocalDateTime(entry.endTime)
                                : "В процессе"}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {entry.formattedDuration}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
