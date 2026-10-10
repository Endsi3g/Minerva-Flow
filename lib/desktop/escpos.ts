/** Minimal ESC/POS ticket builder (code page 858 for French accents). */

const CP858: Record<string, number> = {
  "é": 0x82, "è": 0x8a, "ê": 0x88, "ë": 0x89, "à": 0x85, "â": 0x83, "ä": 0x84, "ç": 0x87,
  "î": 0x8c, "ï": 0x8b, "ô": 0x93, "ö": 0x94, "ù": 0x97, "û": 0x96, "ü": 0x81,
  "É": 0x90, "È": 0xd4, "Ê": 0xd2, "À": 0xb7, "Â": 0xb6, "Ç": 0x80, "Î": 0xd7, "Ô": 0xe2, "Ù": 0xeb, "Û": 0xea,
  "€": 0xd5, "’": 0x27, "«": 0xae, "»": 0xaf,
};

function encode(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const mapped = CP858[char];
    if (mapped !== undefined) bytes.push(mapped);
    else if (char.charCodeAt(0) < 128) bytes.push(char.charCodeAt(0));
    else bytes.push(0x3f);
  }
  return bytes;
}

export type TicketLine = { left: string; right?: string };

export type TicketInput = {
  title: string;
  subtitle?: string;
  lines: TicketLine[];
  footer?: string;
  width?: number;
};

/** 80 mm paper = 48 columns, 58 mm = 32. */
export function buildTicket({ title, subtitle, lines, footer, width = 42 }: TicketInput): Uint8Array {
  const out: number[] = [0x1b, 0x40, 0x1b, 0x74, 19]; // init, select code page 858
  const push = (...values: number[]) => out.push(...values);
  const text = (value: string) => push(...encode(value), 0x0a);

  push(0x1b, 0x61, 1); // center
  push(0x1b, 0x45, 1, 0x1d, 0x21, 0x11); // bold, double size
  text(title);
  push(0x1d, 0x21, 0x00, 0x1b, 0x45, 0); // normal
  if (subtitle) text(subtitle);
  push(0x1b, 0x61, 0); // left
  text("-".repeat(width));
  for (const line of lines) {
    if (!line.right) {
      text(line.left.slice(0, width));
      continue;
    }
    const space = Math.max(1, width - line.left.length - line.right.length);
    text(`${line.left.slice(0, Math.max(0, width - line.right.length - 1))}${" ".repeat(space)}${line.right}`);
  }
  text("-".repeat(width));
  if (footer) {
    push(0x1b, 0x61, 1);
    text(footer);
  }
  push(0x0a, 0x0a, 0x0a, 0x1d, 0x56, 66, 0); // feed and partial cut
  return Uint8Array.from(out);
}
