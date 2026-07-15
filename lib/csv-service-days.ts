import type { ServiceSource } from "@/lib/types";
import type { ServiceDayInput } from "@/lib/data/service-days";

/**
 * Parses a CSV export of historical daily revenue (the format a restaurant
 * migrating from Excel/Google Sheets is most likely to already have) into
 * ServiceDayInput rows — deliberately a much smaller column set than the
 * live /days form: Date + Revenu are the only requirements, everything
 * else defaults exactly like a manual entry would.
 */

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function normalizeHeader(value: string): string {
  return stripAccents(value.trim().toLowerCase());
}

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9,.\-]/g, "").trim();
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;

  if (lastComma > -1 && lastDot > -1) {
    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (lastComma > -1) {
    normalized = cleaned.replace(",", ".");
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const match = trimmed.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

const sourceAliases: Record<string, ServiceSource> = {
  salle: "salle",
  livraison: "livraison",
  delivery: "livraison",
  reservation: "reservation",
  reservations: "reservation",
};

function parseSource(raw: string | undefined): ServiceSource {
  if (!raw) return "salle";
  const key = stripAccents(raw.trim().toLowerCase());
  return sourceAliases[key] ?? "salle";
}

export function parseServiceDaysCsv(text: string): {
  rows: ServiceDayInput[];
  errors: string[];
} {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], errors: ["Le fichier est vide ou ne contient aucune ligne de données."] };
  }

  const header = splitCsvLine(lines[0]).map(normalizeHeader);
  const col = (names: string[]) => header.findIndex((h) => names.includes(h));

  const dateIdx = col(["date"]);
  const revenueIdx = col(["revenu", "revenue", "ca", "chiffre d'affaires", "chiffre daffaires"]);
  const expensesIdx = col(["depenses", "expenses", "couts", "cout"]);
  const sourceIdx = col(["source", "source principale", "mainsource"]);
  const notesIdx = col(["notes", "note", "commentaire", "commentaires"]);

  if (dateIdx === -1 || revenueIdx === -1) {
    return {
      rows: [],
      errors: ['Colonnes requises manquantes : "Date" et "Revenu".'],
    };
  }

  const rows: ServiceDayInput[] = [];
  const errors: string[] = [];
  const seenDates = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i]);
    const rawDate = fields[dateIdx] ?? "";
    const rawRevenue = fields[revenueIdx] ?? "";

    const date = parseDate(rawDate);
    const revenue = parseAmount(rawRevenue);

    if (!date || revenue === null) {
      errors.push(`Ligne ${i + 1} ignorée : date ou revenu invalide.`);
      continue;
    }
    if (seenDates.has(date)) {
      errors.push(`Ligne ${i + 1} ignorée : le ${date} apparaît deux fois dans le fichier.`);
      continue;
    }
    seenDates.add(date);

    const expenses = expensesIdx > -1 ? parseAmount(fields[expensesIdx] ?? "") : null;

    rows.push({
      date,
      revenue: Math.abs(revenue),
      expenses: expenses !== null ? Math.abs(expenses) : undefined,
      mainSource: parseSource(sourceIdx > -1 ? fields[sourceIdx] : undefined),
      notes: notesIdx > -1 ? (fields[notesIdx] ?? "").trim() || undefined : undefined,
    });
  }

  return { rows, errors };
}
