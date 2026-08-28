"use client";

import React, { useState, useMemo } from "react";
import { ArrowUpDown, Search, Sparkles } from "lucide-react";
import type { GenerativeDataTableData } from "@/lib/types/generative-ui";
import { cn, formatCurrency } from "@/lib/utils";

const BADGE_TONES = {
  emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  rose: "bg-rose-50 text-rose-800 border-rose-200",
  blue: "bg-blue-50 text-blue-800 border-blue-200",
  neutral: "bg-gray-100 text-gray-800 border-gray-200",
};

export function GenerativeDataTable({
  data,
  onRowAction,
}: {
  data: GenerativeDataTableData;
  onRowAction?: (promptText: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filteredAndSortedRows = useMemo(() => {
    let rows = [...data.rows];

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r.cells).some((val) =>
          String(val).toLowerCase().includes(q)
        )
      );
    }

    if (sortKey) {
      rows.sort((a, b) => {
        const valA = a.cells[sortKey];
        const valB = b.cells[sortKey];

        if (typeof valA === "number" && typeof valB === "number") {
          return sortDir === "asc" ? valA - valB : valB - valA;
        }
        return sortDir === "asc"
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return rows;
  }, [data.rows, search, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="bg-white border border-[#E8E5DF] rounded-2xl p-4 shadow-2xs space-y-3 my-3">
      {/* Header with Title & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#F0EFEA]">
        <div>
          <h4 className="font-sans font-bold text-sm text-[#1F1E1D]">
            {data.title}
          </h4>
          {data.description && (
            <p className="text-[11.5px] text-[#6A6860] mt-0.5">
              {data.description}
            </p>
          )}
        </div>

        <div className="relative flex items-center">
          <Search size={12} className="absolute left-2.5 text-[#8A887F]" />
          <input
            type="text"
            placeholder="Filtrer les lignes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-48 h-7 pl-7 pr-2.5 rounded-lg bg-[#FAF8F5] border border-[#E2E0D8] text-xs text-[#1F1E1D] placeholder:text-[#8A887F] focus:bg-white focus:border-[#0E7C5A] focus:outline-none"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E8E5DF] text-[#5A5851] bg-[#FAF8F5]">
              {data.columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={cn(
                    "py-2 px-3 font-semibold text-[11px] uppercase tracking-wider cursor-pointer select-none hover:text-[#1F1E1D]",
                    col.align === "right" || col.isNumeric ? "text-right" : "text-left"
                  )}
                >
                  <div className={cn("inline-flex items-center gap-1", (col.align === "right" || col.isNumeric) && "flex-row-reverse")}>
                    <span>{col.label}</span>
                    <ArrowUpDown size={11} className="opacity-50" />
                  </div>
                </th>
              ))}
              {data.rows.some((r) => r.statusBadge || r.actionPrompt) && (
                <th className="py-2 px-3 text-right font-semibold text-[11px] uppercase tracking-wider">
                  Action / Statut
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EFEA]">
            {filteredAndSortedRows.map((row) => (
              <tr key={row.id} className="hover:bg-[#FAF8F5]/80 transition-colors group">
                {data.columns.map((col) => {
                  const val = row.cells[col.key];
                  const formatted =
                    typeof val === "number"
                      ? col.unit === "currency"
                        ? formatCurrency(val)
                        : col.unit === "percent"
                        ? `${val.toFixed(1)} %`
                        : val.toLocaleString("fr-CA")
                      : val;

                  return (
                    <td
                      key={col.key}
                      className={cn(
                        "py-2 px-3 text-[12px] font-medium text-[#1F1E1D]",
                        col.align === "right" || col.isNumeric
                          ? "text-right font-mono"
                          : "text-left"
                      )}
                    >
                      {formatted}
                    </td>
                  );
                })}

                {(row.statusBadge || row.actionPrompt) && (
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {row.statusBadge && (
                        <span
                          className={cn(
                            "px-2 py-0.5 text-[10px] font-bold rounded-full border",
                            BADGE_TONES[row.statusBadge.tone] || BADGE_TONES.neutral
                          )}
                        >
                          {row.statusBadge.label}
                        </span>
                      )}
                      {row.actionPrompt && (
                        <button
                          type="button"
                          onClick={() => onRowAction?.(row.actionPrompt!)}
                          className="h-6 w-6 rounded-md bg-[#0E7C5A]/10 hover:bg-[#0E7C5A] text-[#0E7C5A] hover:text-white flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                          title="Analyser cette ligne"
                        >
                          <Sparkles size={11} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>

          {/* Optional Summary Row */}
          {data.summaryRow && (
            <tfoot>
              <tr className="border-t-2 border-[#E8E5DF] bg-[#FAF8F5] font-bold text-[#0A3F2F]">
                {data.columns.map((col) => {
                  const val = data.summaryRow![col.key];
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        "py-2 px-3 text-[12px]",
                        col.align === "right" || col.isNumeric ? "text-right font-mono" : "text-left"
                      )}
                    >
                      {val ?? ""}
                    </td>
                  );
                })}
                <td className="py-2 px-3" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
