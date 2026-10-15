/** Urgency colors: soonest → furthest. */
const DUE_COLORS = {
  overdueOrToday: '#DC2626', // red
  soon: '#EA580C', // orange
  mid: '#16A34A', // green
  later: '#2563EB', // blue
  furthest: '#7C3AED', // purple
} as const;

const MS_DAY = 24 * 60 * 60 * 1000;

/**
 * Color an assignment by how soon it is due.
 * Red (most severe) → orange → green → blue → purple (furthest).
 */
export default function dueDateColor(
  dueAt: string | null | undefined,
  now: Date = new Date()
): string {
  if (!dueAt) return DUE_COLORS.furthest;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return DUE_COLORS.furthest;

  const msLeft = due.getTime() - now.getTime();
  if (msLeft < MS_DAY) return DUE_COLORS.overdueOrToday; // overdue or due within ~24h
  if (msLeft < 2 * MS_DAY) return DUE_COLORS.soon;
  if (msLeft < 4 * MS_DAY) return DUE_COLORS.mid;
  if (msLeft < 7 * MS_DAY) return DUE_COLORS.later;
  return DUE_COLORS.furthest;
}
