import { addDays, format } from "date-fns";
import { pt } from "date-fns/locale";

export function calculateExpiryDate(durationDays: number): Date {
  return addDays(new Date(), durationDays);
}

export function formatExpiryDate(date: Date): string {
  return format(date, "dd MMM yyyy", { locale: pt });
}

export function formatDateForInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function getTodayForInput(): string {
  return formatDateForInput(new Date());
}

export function getMaxDateForInput(): string {
  const maxDate = addDays(new Date(), 365 * 5);
  return formatDateForInput(maxDate);
}

export function calculateExpiryFromDuration(durationDays: number): string {
  const expiryDate = calculateExpiryDate(durationDays);
  return formatDateForInput(expiryDate);
}
