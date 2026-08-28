"use client";

import React, { useState } from "react";
import { Check, Sparkles, ExternalLink } from "lucide-react";
import type { GenerativeChecklistData, TaskPriority } from "@/lib/types/generative-ui";
import { cn } from "@/lib/utils";
import Link from "next/link";

const PRIORITY_BADGES: Record<TaskPriority, { label: string; tone: string }> = {
  haute: { label: "Haute", tone: "bg-rose-50 text-rose-700 border-rose-200" },
  moyenne: { label: "Moyenne", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  basse: { label: "Basse", tone: "bg-blue-50 text-blue-700 border-blue-200" },
};

export function GenerativeChecklist({
  data,
  onTaskToggle,
}: {
  data: GenerativeChecklistData;
  onTaskToggle?: (taskId: string, isCompleted: boolean) => void;
}) {
  const [completed, setCompleted] = useState<Record<string, boolean>>(() =>
    (data.items || []).reduce((acc, item) => {
      acc[item.id] = item.isCompleted;
      return acc;
    }, {} as Record<string, boolean>)
  );

  const toggleTask = (id: string) => {
    const nextState = !completed[id];
    setCompleted((prev) => ({ ...prev, [id]: nextState }));
    onTaskToggle?.(id, nextState);
  };

  const totalTasks = data.items.length;
  const completedCount = Object.values(completed).filter(Boolean).length;
  const progressPercent = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

  return (
    <div className="bg-white border border-[#E8E5DF] rounded-2xl p-4 shadow-2xs space-y-3.5 my-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#F0EFEA]">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center h-5 w-5 rounded-lg bg-[#0E7C5A]/10 text-[#0E7C5A]">
              <Sparkles size={11} />
            </span>
            <h4 className="font-sans font-bold text-sm text-[#1F1E1D]">
              {data.title}
            </h4>
          </div>
          <p className="text-[11.5px] text-[#6A6860] mt-0.5">
            {completedCount} sur {totalTasks} actions complétées
          </p>
        </div>

        {data.estimatedTotalImpact && (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            {data.estimatedTotalImpact}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-[#FAF8F5] border border-[#E8E5DF] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#0E7C5A] transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        {data.items.map((item) => {
          const isDone = Boolean(completed[item.id]);
          const priorityInfo = PRIORITY_BADGES[item.priority] || PRIORITY_BADGES.moyenne;

          return (
            <div
              key={item.id}
              onClick={() => toggleTask(item.id)}
              className={cn(
                "group flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer",
                isDone
                  ? "bg-[#FAF8F5]/60 border-[#E8E5DF] opacity-75"
                  : "bg-white border-[#E8E5DF] hover:border-[#0E7C5A]/40 hover:bg-[#FAF8F5]/30"
              )}
            >
              {/* Checkbox */}
              <div
                className={cn(
                  "mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition-all",
                  isDone
                    ? "bg-[#0E7C5A] border-[#0E7C5A] text-white"
                    : "border-[#D1CECA] bg-white group-hover:border-[#0E7C5A]"
                )}
              >
                {isDone && <Check size={12} strokeWidth={3} />}
              </div>

              {/* Text & Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "font-sans text-xs font-semibold text-[#1F1E1D]",
                      isDone && "line-through text-[#8A887F]"
                    )}
                  >
                    {item.label}
                  </span>

                  <span
                    className={cn(
                      "px-1.5 py-0.2 text-[9.5px] font-bold rounded border uppercase tracking-wider",
                      priorityInfo.tone
                    )}
                  >
                    {priorityInfo.label}
                  </span>

                  {item.assignedRole && (
                    <span className="text-[10px] font-medium text-[#8A887F] bg-[#FAF8F5] border border-[#E8E5DF] px-1.5 py-0.2 rounded">
                      {item.assignedRole}
                    </span>
                  )}
                </div>

                {item.description && (
                  <p className="text-[11px] text-[#6A6860] mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                )}

                {item.estimatedImpact && (
                  <div className="mt-1 text-[10.5px] font-semibold text-emerald-700">
                    Impact : {item.estimatedImpact}
                  </div>
                )}
              </div>

              {item.actionUrl && (
                <Link
                  href={item.actionUrl}
                  onClick={(e) => e.stopPropagation()}
                  className="h-6 w-6 rounded-md bg-[#FAF8F5] hover:bg-[#0E7C5A] text-[#5A5851] hover:text-white border border-[#E8E5DF] flex items-center justify-center shrink-0 transition-colors"
                  title="Ouvrir le module"
                >
                  <ExternalLink size={11} />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
