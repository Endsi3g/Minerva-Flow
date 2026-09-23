const DAY_MS = 86_400_000;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function dateInTimeZone(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(value.year), month: Number(value.month), day: Number(value.day) };
}

/** Days until a birthday using the restaurant's calendar day (not the device timezone). */
export function getDaysUntilBirthday(
  birthday: string | null | undefined,
  now = new Date(),
  timeZone = "America/Toronto",
): number | null {
  if (!birthday) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday);
  if (!match) return null;

  const birthMonth = Number(match[2]);
  const birthDay = Number(match[3]);
  const maxDay = new Date(Date.UTC(2000, birthMonth, 0)).getUTCDate();
  if (birthMonth < 1 || birthMonth > 12 || birthDay < 1 || birthDay > maxDay) return null;

  let today: { year: number; month: number; day: number };
  try {
    today = dateInTimeZone(now, timeZone);
  } catch {
    today = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }

  let year = today.year;
  let day = birthDay;
  if (birthMonth === 2 && birthDay === 29 && !isLeapYear(year)) day = 28;

  const todayOrdinal = Date.UTC(today.year, today.month - 1, today.day);
  let targetOrdinal = Date.UTC(year, birthMonth - 1, day);
  if (targetOrdinal < todayOrdinal) {
    year += 1;
    day = birthMonth === 2 && birthDay === 29 && !isLeapYear(year) ? 28 : birthDay;
    targetOrdinal = Date.UTC(year, birthMonth - 1, day);
  }

  return Math.round((targetOrdinal - todayOrdinal) / DAY_MS);
}
