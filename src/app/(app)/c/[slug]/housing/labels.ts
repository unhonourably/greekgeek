import type { Tone } from "@/components/ui";

export const PRIORITY = {
  low: { label: "Low", tone: "neutral" },
  normal: { label: "Normal", tone: "info" },
  high: { label: "High", tone: "warning" },
  urgent: { label: "Urgent", tone: "danger" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export const MAINTENANCE_STATUS = {
  open: { label: "Open", tone: "warning" },
  in_progress: { label: "In progress", tone: "info" },
  resolved: { label: "Resolved", tone: "positive" },
  closed: { label: "Closed", tone: "neutral" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export const SUPPLY_STATUS = {
  requested: { label: "Requested", tone: "warning" },
  approved: { label: "Approved", tone: "info" },
  fulfilled: { label: "Fulfilled", tone: "positive" },
  declined: { label: "Declined", tone: "neutral" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export const FACILITY_KIND: Record<string, string> = {
  house: "House",
  room: "Room",
  common_area: "Common area",
  parking: "Parking",
  other: "Other",
};
