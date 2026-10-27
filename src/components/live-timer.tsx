"use client";

import React, { useEffect, useState } from "react";
import { formatDurationTimer } from "@/lib/time";

interface LiveTimerProps {
  startTime: string;
  className?: string;
  testId?: string;
}

export function LiveTimer({ startTime, className, testId = "active-timer-clock" }: LiveTimerProps) {
  const [elapsedMs, setElapsedMs] = useState<number>(() => {
    const startMs = new Date(startTime).getTime();
    return Math.max(0, Date.now() - startMs);
  });

  useEffect(() => {
    const startMs = new Date(startTime).getTime();
    const update = () => {
      setElapsedMs(Math.max(0, Date.now() - startMs));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span
      data-testid={testId}
      className={className ?? "font-mono font-semibold tabular-nums"}
    >
      {formatDurationTimer(elapsedMs)}
    </span>
  );
}
