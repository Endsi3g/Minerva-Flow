"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { FinanceView } from "@/app/(app)/finance/FinanceView";
import { DaysView } from "@/app/(app)/days/DaysView";
import type { Connection, ExpenseCategory, FinancialTransaction, ServiceDay } from "@/lib/types";

const tabTriggerClass =
  "rounded-full px-3.5 py-1.5 text-[13px] font-semibold data-active:bg-mv-surface data-active:text-mv-ink data-active:shadow-mv-sm";

/**
 * Mobile-first consolidated "Données" tab — bundles the existing
 * Finance and Days pages under one route so the 5-tab bottom nav
 * doesn't need to pick just one. Desktop still has /finance and /days
 * as separate sidebar links; this is purely additive.
 */
export function DataTabsView({
  transactions,
  expenseCategories,
  connections,
  serviceDays,
}: {
  transactions: FinancialTransaction[];
  expenseCategories: ExpenseCategory[];
  connections: Connection[];
  serviceDays: ServiceDay[];
}) {
  return (
    <Tabs defaultValue="finance">
      <TabsList className="mb-6 h-auto rounded-full border border-mv-border bg-mv-cream-soft p-1">
        <TabsTrigger value="finance" className={tabTriggerClass}>
          Finance
        </TabsTrigger>
        <TabsTrigger value="days" className={tabTriggerClass}>
          Journées
        </TabsTrigger>
      </TabsList>

      <TabsContent value="finance">
        <FinanceView
          transactions={transactions}
          expenseCategories={expenseCategories}
          connections={connections}
        />
      </TabsContent>

      <TabsContent value="days">
        <DaysView initialServiceDays={serviceDays} />
      </TabsContent>
    </Tabs>
  );
}
