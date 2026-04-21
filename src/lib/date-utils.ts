import { addDays, format, differenceInCalendarDays } from "date-fns";
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

export function getEffectiveExpiry(item: {
  expires_at: string;
  opened_at?: string | null;
  opened_duration_days?: number | null;
}): Date {
  const originalExpiry = new Date(item.expires_at);
  if (item.opened_at && item.opened_duration_days) {
    const openedExpiry = addDays(new Date(item.opened_at), item.opened_duration_days);
    return openedExpiry < originalExpiry ? openedExpiry : originalExpiry;
  }
  return originalExpiry;
}

export function daysUntilExpiry(item: {
  expires_at: string;
  opened_at?: string | null;
  opened_duration_days?: number | null;
}): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInCalendarDays(getEffectiveExpiry(item), today);
}
