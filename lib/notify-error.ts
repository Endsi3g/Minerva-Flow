import { toast } from "sonner";
import { logAppErrorAction } from "@/app/[locale]/(app)/system-actions";

/**
 * Drop-in replacement for `toast.error(message)` that also logs the
 * failure to the notification bell (owners/managers) so it isn't lost the
 * moment the toast fades. Fire-and-forget — never blocks or throws.
 */
export function notifyError(message: string) {
  toast.error(message);
  void logAppErrorAction(message);
}
