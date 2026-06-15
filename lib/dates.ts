const APP_TIME_ZONE = "Europe/Berlin";

function getBerlinParts(value: string | Date) {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(value));

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value)
  };
}

function getBerlinOffsetMinutes(date: Date) {
  const timeZoneName = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    timeZoneName: "shortOffset"
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  const match = timeZoneName?.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  return sign * (hours * 60 + minutes);
}

function berlinMidnightUtc(year: number, month: number, day: number) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const offsetMinutes = getBerlinOffsetMinutes(utcGuess);
  return new Date(utcGuess.getTime() - offsetMinutes * 60 * 1000);
}

export function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: APP_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatShortDate(value: string | Date) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: APP_TIME_ZONE,
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(value));
}

export function formatDayHeading(value: string | Date) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(new Date(value));
}

export function dateKey(value: string | Date) {
  const { year, month, day } = getBerlinParts(value);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function startOfLocalDay(date = new Date()) {
  const { year, month, day } = getBerlinParts(date);
  return berlinMidnightUtc(year, month, day);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
