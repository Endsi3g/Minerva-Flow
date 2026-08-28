export type KpiMetricUnit = "currency" | "percent" | "number" | "hours";

export interface GenerativeKpiItem {
  id: string;
  label: string;
  value: number;
  unit: KpiMetricUnit;
  deltaPercent?: number;
  deltaLabel?: string;
  isPositive?: boolean;
  target?: number;
  progressPercent?: number;
  status?: "optimal" | "warning" | "critical" | "neutral";
  tooltip?: string;
}

export interface GenerativeKpiGridData {
  title?: string;
  items: GenerativeKpiItem[];
}

export interface DataTableColumn {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  isNumeric?: boolean;
  unit?: KpiMetricUnit;
}

export interface DataTableRow {
  id: string;
  cells: Record<string, string | number>;
  statusBadge?: {
    label: string;
    tone: "emerald" | "amber" | "rose" | "blue" | "neutral";
  };
  actionPrompt?: string;
}

export interface GenerativeDataTableData {
  title: string;
  description?: string;
  columns: DataTableColumn[];
  rows: DataTableRow[];
  summaryRow?: Record<string, string | number>;
}

export type TaskPriority = "haute" | "moyenne" | "basse";

export interface GenerativeChecklistItem {
  id: string;
  label: string;
  description?: string;
  priority: TaskPriority;
  isCompleted: boolean;
  assignedRole?: string;
  estimatedImpact?: string;
  actionUrl?: string;
}

export interface GenerativeChecklistData {
  title: string;
  estimatedTotalImpact?: string;
  items: GenerativeChecklistItem[];
}

export type AlertSeverity = "critical" | "warning" | "info" | "success";

export interface GenerativeAlertData {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  metricHighlight?: string;
  actionLabel?: string;
  actionPrompt?: string;
  actionUrl?: string;
}

export type ArtifactType =
  | "action_plan"
  | "menu_engineering_matrix"
  | "financial_audit"
  | "stock_rebalance"
  | "staffing_forecast";

export interface ArtifactVersion {
  versionNumber: number;
  timestamp: string;
  summary: string;
}

export interface ActionableArtifactPayload {
  id: string;
  title: string;
  type: ArtifactType;
  version: number;
  versionsCount: number;
  summary: string;
  createdAt: string;
  isApplied: boolean;
  appliedAt?: string;
  data: {
    kpis?: GenerativeKpiGridData;
    table?: GenerativeDataTableData;
    checklist?: GenerativeChecklistData;
    alerts?: GenerativeAlertData[];
    chartData?: {
      title: string;
      xAxisKey: string;
      series: Array<{ key: string; name: string; color: string }>;
      points: Array<Record<string, string | number>>;
    };
    rawJson?: Record<string, unknown>;
    rawCsv?: string;
  };
}

export interface SlashCommandDef {
  command: string;
  label: string;
  description: string;
  category: "audit" | "operations" | "menu" | "export";
  promptTemplate: string;
}

export interface ContextMentionDef {
  mention: string;
  label: string;
  description: string;
  category: "pos" | "inventory" | "menu" | "staff";
  snippet: string;
}
