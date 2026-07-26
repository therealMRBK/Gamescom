"use client";

import { useTransition } from "react";
import { setAvailability } from "@/lib/actions/users";
import { EVENT_DAYS } from "@/lib/constants";

type AvailabilityMap = Record<
  string,
  { onSite: boolean; timeFrom: string; timeTo: string }
>;

export function AvailabilityEditor({
  userId,
  initial,
}: {
  userId: string;
  initial: AvailabilityMap;
}) {
  const [isPending, startTransition] = useTransition();

  function save(
    day: string,
    onSite: boolean,
    timeFrom: string,
    timeTo: string,
  ) {
    startTransition(() => setAvailability(userId, day, onSite, timeFrom, timeTo));
  }

  return (
    <div className="space-y-2">
      {EVENT_DAYS.map((d) => {
        const entry = initial[d.date] || { onSite: false, timeFrom: "", timeTo: "" };
        return (
          <div
            key={d.date}
            className="flex flex-wrap items-center gap-2 rounded-xl bg-stone-900 p-3 ring-1 ring-stone-800"
          >
            <label className="flex flex-1 items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                defaultChecked={entry.onSite}
                disabled={isPending}
                onChange={(e) => {
                  const timeFromEl = document.getElementById(
                    `${userId}-${d.date}-from`,
                  ) as HTMLInputElement | null;
                  const timeToEl = document.getElementById(
                    `${userId}-${d.date}-to`,
                  ) as HTMLInputElement | null;
                  save(
                    d.date,
                    e.target.checked,
                    timeFromEl?.value || "",
                    timeToEl?.value || "",
                  );
                }}
                className="h-5 w-5 rounded"
              />
              {d.label}
              <span className="text-xs text-stone-500">{d.phase}</span>
            </label>
            <input
              id={`${userId}-${d.date}-from`}
              type="time"
              defaultValue={entry.timeFrom}
              disabled={isPending}
              onBlur={(e) => {
                const checkboxEl = e.target
                  .closest("div")
                  ?.querySelector<HTMLInputElement>('input[type="checkbox"]');
                const timeToEl = document.getElementById(
                  `${userId}-${d.date}-to`,
                ) as HTMLInputElement | null;
                save(
                  d.date,
                  checkboxEl?.checked ?? entry.onSite,
                  e.target.value,
                  timeToEl?.value || "",
                );
              }}
              className="input w-24 !px-2 !py-1.5 text-sm"
            />
            <span className="text-stone-500">–</span>
            <input
              id={`${userId}-${d.date}-to`}
              type="time"
              defaultValue={entry.timeTo}
              disabled={isPending}
              onBlur={(e) => {
                const checkboxEl = e.target
                  .closest("div")
                  ?.querySelector<HTMLInputElement>('input[type="checkbox"]');
                const timeFromEl = document.getElementById(
                  `${userId}-${d.date}-from`,
                ) as HTMLInputElement | null;
                save(
                  d.date,
                  checkboxEl?.checked ?? entry.onSite,
                  timeFromEl?.value || "",
                  e.target.value,
                );
              }}
              className="input w-24 !px-2 !py-1.5 text-sm"
            />
          </div>
        );
      })}
    </div>
  );
}
