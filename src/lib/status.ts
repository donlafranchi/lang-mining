// The lesson is built in the background with a 300s function limit. If the function
// is killed, the row stays "processing" forever, so past this age it counts as failed.
export const STALE_AFTER_MS = 6 * 60 * 1000;

type Status = "processing" | "ready" | "failed";

export function effectiveStatus(row: { status: Status; created_at: string }, now: Date = new Date()): Status {
  if (row.status !== "processing") return row.status;
  return now.getTime() - new Date(row.created_at).getTime() > STALE_AFTER_MS ? "failed" : "processing";
}
