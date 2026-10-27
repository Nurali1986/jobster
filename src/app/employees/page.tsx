"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  UserPlus,
  Search,
  Edit2,
  UserX,
  UserCheck,
  AlertCircle,
  CheckCircle2,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EmployeeItem {
  id: string;
  name: string;
  email: string | null;
  position: string | null;
  isActive: boolean;
  totalEntriesCount: number;
  activeTimer: {
    id: string;
    taskDescription: string;
    startTime: string;
  } | null;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "true" | "false">(
    "all"
  );

  // Add Employee form state
  const [newName, setNewName] = useState<string>("");
  const [newPosition, setNewPosition] = useState<string>("");
  const [newEmail, setNewEmail] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Edit Employee modal state
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(
    null
  );
  const [editName, setEditName] = useState<string>("");
  const [editPosition, setEditPosition] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim() !== "") {
        params.set("search", searchQuery.trim());
      }
      if (statusFilter !== "all") {
        params.set("active", statusFilter);
      }

      const res = await fetch(`/api/employees?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          position: newPosition || null,
          email: newEmail || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? "Не удалось добавить сотрудника.");
        return;
      }

      setNewName("");
      setNewPosition("");
      setNewEmail("");
      setFormSuccess(`Сотрудник «${data.employee.name}» успешно добавлен.`);
      await loadEmployees();
    } catch {
      setFormError("Ошибка соединения с сервером.");
    } finally {
      setSubmitting(false);
    }
  }

  function openEditDialog(employee: EmployeeItem) {
    setEditingEmployee(employee);
    setEditName(employee.name);
    setEditPosition(employee.position ?? "");
    setEditEmail(employee.email ?? "");
    setEditError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEmployee) return;
    setEditError(null);
    setSavingEdit(true);

    try {
      const res = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          position: editPosition || null,
          email: editEmail || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setEditError(data.error ?? "Не удалось сохранить изменения.");
        return;
      }

      setEditingEmployee(null);
      await loadEmployees();
    } catch {
      setEditError("Ошибка соединения с сервером.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggleActive(employee: EmployeeItem) {
    setFormError(null);
    setFormSuccess(null);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !employee.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Не удалось изменить статус сотрудника.");
        return;
      }
      await loadEmployees();
    } catch {
      setFormError("Ошибка соединения с сервером.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Сотрудники
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Добавление сотрудников, редактирование данных и управление статусом
          активности
        </p>
      </div>

      {/* Add Employee Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-slate-700" />
            <span>Добавить сотрудника</span>
          </CardTitle>
          <CardDescription>
            Укажите имя, должность и при необходимости корпоративный email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleCreateEmployee}
            data-testid="create-employee-form"
            className="space-y-4"
          >
            {formError && (
              <div
                role="alert"
                data-testid="employee-form-error"
                className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div
                data-testid="employee-form-success"
                className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="employee-name-input">Имя и фамилия *</Label>
                <Input
                  id="employee-name-input"
                  data-testid="employee-name-input"
                  placeholder="Иван Петров"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="employee-position-input">Должность</Label>
                <Input
                  id="employee-position-input"
                  data-testid="employee-position-input"
                  placeholder="Разработчик"
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="employee-email-input">
                  Email (необязательно)
                </Label>
                <Input
                  id="employee-email-input"
                  data-testid="employee-email-input"
                  type="email"
                  placeholder="ivan.petrov@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                data-testid="employee-submit-button"
                disabled={submitting}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Добавить сотрудника
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Employees List & Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Список сотрудников</CardTitle>
              <CardDescription>
                При деактивации сотрудника все его исторические записи времени
                сохраняются
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  data-testid="employee-search-input"
                  placeholder="Поиск сотрудника..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-60"
                />
              </div>

              <select
                aria-label="Фильтр по статусу активности"
                data-testid="employee-status-filter"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | "true" | "false")
                }
                className="h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="all">Все сотрудники</option>
                <option value="true">Только активные</option>
                <option value="false">Деактивированные</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Загрузка списка сотрудников...
            </div>
          ) : employees.length === 0 ? (
            <div
              data-testid="employees-empty-state"
              className="py-10 text-center text-sm text-slate-500"
            >
              Сотрудники не найдены. Добавьте сотрудника с помощью формы выше.
            </div>
          ) : (
            <Table data-testid="employees-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Имя</TableHead>
                  <TableHead>Должность</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-center">Записей</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id} data-testid={`employee-row-${emp.id}`}>
                    <TableCell className="font-medium text-slate-900">
                      <div>{emp.name}</div>
                      {emp.activeTimer && (
                        <div className="text-xs text-emerald-700 mt-0.5">
                          Работает: {emp.activeTimer.taskDescription}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {emp.position || "—"}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {emp.email || "—"}
                    </TableCell>
                    <TableCell>
                      {emp.isActive ? (
                        <Badge variant="success">Активен</Badge>
                      ) : (
                        <Badge variant="secondary">Неактивен</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {emp.totalEntriesCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(emp)}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          Изменить
                        </Button>
                        <Button
                          variant={emp.isActive ? "ghost" : "secondary"}
                          size="sm"
                          onClick={() => handleToggleActive(emp)}
                        >
                          {emp.isActive ? (
                            <>
                              <UserX className="h-3.5 w-3.5 mr-1 text-red-600" />
                              Деактивировать
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                              Активировать
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Employee Dialog */}
      <Dialog
        open={Boolean(editingEmployee)}
        onOpenChange={(open) => {
          if (!open) setEditingEmployee(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать данные сотрудника</DialogTitle>
            <DialogDescription>
              Обновите имя, должность или контактный email сотрудника
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                {editError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="edit-employee-name">Имя и фамилия *</Label>
              <Input
                id="edit-employee-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-employee-position">Должность</Label>
              <Input
                id="edit-employee-position"
                value={editPosition}
                onChange={(e) => setEditPosition(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-employee-email">Email</Label>
              <Input
                id="edit-employee-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingEmployee(null)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={savingEdit}>
                Сохранить изменения
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
