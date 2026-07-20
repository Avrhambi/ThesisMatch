const DEFAULT_TIME_ZONE = "Asia/Jerusalem";

// en-CA locale formats as YYYY-MM-DD, matching Postgres `date` input.
export function localDateString(date: Date = new Date(), timeZone: string = process.env.APP_TIME_ZONE ?? DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
