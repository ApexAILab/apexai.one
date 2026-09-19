import { CHINA_TIME_ZONE } from "@/lib/constants";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CHINA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function toChinaDayKey(value: Date | string) {
  const parts = dayFormatter.formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function chinaMonthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1) - 8 * 60 * 60 * 1000);
  const end = new Date(Date.UTC(year, monthNumber, 1) - 8 * 60 * 60 * 1000);
  return { start, end };
}

export function todayInChina() {
  return toChinaDayKey(new Date());
}

export function chinaDayBounds(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, date) - 8 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function formatThoughtTime(value: Date | string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: CHINA_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(new Date(value))
    .replace(/\//g, "/")
    .replace(/\s/g, " ");
}

export function toDatetimeLocalValue(value: Date | string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHINA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}

export function chinaLocalInputToIso(value: string) {
  return new Date(`${value}+08:00`).toISOString();
}
