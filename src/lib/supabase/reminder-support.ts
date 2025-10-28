export type PostgrestLikeError = {
  message?: string;
} | null;

const REMINDER_COLUMN_TOKEN = "remind_";

export function isReminderColumnMissing(error: PostgrestLikeError): boolean {
  if (!error || typeof error.message !== "string") {
    return false;
  }

  const message = error.message.toLowerCase();
  if (!message.includes(REMINDER_COLUMN_TOKEN)) {
    return false;
  }

  return (
    message.includes("remind_24h") ||
    message.includes("remind_2h") ||
    message.includes("schema cache")
  );
}

export function logReminderColumnWarning(context: string) {
  console.warn(
    `[events-reminder] Reminder columns unavailable during ${context}. ` +
      "Falling back to the legacy behaviour without reminders. " +
      "Run the 20240704160000_events_feature migration on the Supabase project to " +
      "enable reminder settings."
  );
}
