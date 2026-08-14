const pad = (value: number) => String(value).padStart(2, "0");

export function toLocalIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getDateRangeError(arrival: string, departure: string): string {
  if (!arrival || !departure) return "";
  return departure <= arrival ? "Departure must be after arrival." : "";
}

