import type { BundleRecord } from "@/types/bundle";
import { isScheduledActive } from "./validation";

export type PublicationStatus = "Active" | "Draft" | "Scheduled" | "Ended";

export function publicationStatus(
  bundle: Pick<BundleRecord, "status" | "configuration">,
  now = Date.now(),
): PublicationStatus {
  if (bundle.status === "Draft") return "Draft";
  const settings = bundle.configuration?.settings;
  if (isScheduledActive(settings, now)) return "Active";
  const start = settings?.startDate
    ? Date.parse(
        `${settings.startDate}T${settings.startTime || "00:00"}:00+07:00`,
      )
    : 0;
  return now < start ? "Scheduled" : "Ended";
}
