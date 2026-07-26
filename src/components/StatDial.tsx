const CIRCUMFERENCE = 2 * Math.PI * 15.5;

const COLOR_CLASSES = {
  accent: "stroke-amber-600",
  good: "stroke-emerald-600",
  bad: "stroke-red-500",
} as const;

export function StatDial({
  value,
  total,
  label,
  color,
}: {
  value: number;
  total: number;
  label: string;
  color: keyof typeof COLOR_CLASSES;
}) {
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  const offset = CIRCUMFERENCE * (1 - pct);

  return (
    <div className="rounded-xl bg-stone-900 p-3 text-center ring-1 ring-stone-800">
      <div className="relative mx-auto h-14 w-14">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-stone-700" />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className={COLOR_CLASSES[color]}
          />
        </svg>
        <span className="tabular-nums absolute inset-0 flex items-center justify-center text-base font-bold text-white">
          {value}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-stone-400">{label}</p>
    </div>
  );
}
