"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Clock,
  BarChart3,
  Menu,
  X,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Обзор",
    icon: LayoutDashboard,
    testId: "nav-dashboard",
  },
  {
    href: "/employees",
    label: "Сотрудники",
    icon: Users,
    testId: "nav-employees",
  },
  {
    href: "/time-tracking",
    label: "Учёт времени",
    icon: Clock,
    testId: "nav-time-tracking",
  },
  {
    href: "/reports",
    label: "Отчёты",
    icon: BarChart3,
    testId: "nav-reports",
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200 bg-white z-30">
        <div className="flex items-center gap-2.5 h-16 px-6 border-b border-slate-200">
          <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center text-white">
            <Timer className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-base leading-tight text-slate-900">
              WorkTime
            </div>
            <div className="text-xs text-slate-500">Учёт рабочего времени</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Основная навигация">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={item.testId}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-500">
          Корпоративный учёт времени
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 border-b border-slate-200 bg-white">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
            <Timer className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm text-slate-900">
            WorkTime — Учёт времени
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Открыть меню навигации"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/40 pt-14" onClick={() => setMobileMenuOpen(false)}>
          <nav
            className="bg-white border-b border-slate-200 px-4 py-3 space-y-1 shadow-lg"
            onClick={(e) => e.stopPropagation()}
            aria-label="Мобильная навигация"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 md:pl-64 pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Quick Nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 grid grid-cols-4 h-16"
        aria-label="Нижняя панель навигации"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs font-medium",
                isActive ? "text-slate-900 font-semibold" : "text-slate-500"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
