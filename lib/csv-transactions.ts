import type { TransactionDirection } from "@/lib/types";
import type { TransactionInput } from "@/lib/data/finance";

/**
 * Parses bank/POS CSV exports into financial_transactions rows. Recognizes
 * the same French headers produced by the Finance page's own CSV export
 * ("Date", "Description", "Montant", "Sens", "Catégorie", "Compte", "Revu")
 * plus a few common English aliases, matched case/accent-insensitively.
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

function parseDirection(raw: string | undefined, amount: number): TransactionDirection {
  const value = raw ? stripAccents(raw.trim().toLowerCase()) : "";
  if (value.startsWith("in") || value.startsWith("entree") || value === "+") return "in";
  if (value.startsWith("out") || value.startsWith("sortie") || value === "-") return "out";
  return amount < 0 ? "out" : "in";
}

export function parseTransactionsCsv(text: string): {
  rows: TransactionInput[];
  errors: string[];
} {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], errors: ["Le fichier est vide ou ne contient aucune ligne de données."] };
  }

  const header = splitCsvLine(lines[0]).map(normalizeHeader);
  const col = (names: string[]) => header.findIndex((h) => names.includes(h));

  const dateIdx = col(["date"]);
  const descIdx = col(["description", "libelle", "memo"]);
  const amountIdx = col(["montant", "amount"]);
  const directionIdx = col(["sens", "direction", "type"]);
  const categoryIdx = col(["categorie", "category"]);
  const accountIdx = col(["compte", "source_account", "sourceaccount", "account"]);
  const reviewedIdx = col(["revu", "reviewed"]);

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    return {
      rows: [],
      errors: ['Colonnes requises manquantes : "Date", "Description" et "Montant".'],
    };
  }

  const rows: TransactionInput[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i]);
    const rawDate = fields[dateIdx] ?? "";
    const rawDesc = fields[descIdx] ?? "";
    const rawAmount = fields[amountIdx] ?? "";

    const date = parseDate(rawDate);
    const amount = parseAmount(rawAmount);

    if (!date || amount === null || !rawDesc.trim()) {
      errors.push(`Ligne ${i + 1} ignorée : données invalides.`);
      continue;
    }

    const direction = parseDirection(directionIdx > -1 ? fields[directionIdx] : undefined, amount);
    const category =
      categoryIdx > -1 && fields[categoryIdx]?.trim() ? fields[categoryIdx].trim() : "Non catégorisé";
    const sourceAccount =
      accountIdx > -1 && fields[accountIdx]?.trim() ? fields[accountIdx].trim() : "Import CSV";
    const reviewedRaw =
      reviewedIdx > -1 ? stripAccents((fields[reviewedIdx] ?? "").trim().toLowerCase()) : "";
    const reviewed = reviewedRaw === "oui" || reviewedRaw === "true" || reviewedRaw === "yes";

    rows.push({
      date,
      description: rawDesc.trim(),
      amount: Math.abs(amount),
      direction,
      category,
      sourceAccount,
      reviewed,
    });
  }

  return { rows, errors };
}
