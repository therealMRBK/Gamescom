"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  CONTACT_CHANNEL_LABELS,
  CONTACT_STATUS_LABELS,
  PRIORITY_LABELS,
} from "@/lib/constants";

export function PublisherFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/publishers?${params.toString()}`);
  }

  const view = searchParams.get("view") || "list";

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select
          className="input !px-2 !py-2 text-xs"
          value={searchParams.get("priority") || ""}
          onChange={(e) => setParam("priority", e.target.value)}
        >
          <option value="">Priorität</option>
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="input !px-2 !py-2 text-xs"
          value={searchParams.get("status") || ""}
          onChange={(e) => setParam("status", e.target.value)}
        >
          <option value="">Status</option>
          {Object.entries(CONTACT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="input !px-2 !py-2 text-xs"
          value={searchParams.get("channel") || ""}
          onChange={(e) => setParam("channel", e.target.value)}
        >
          <option value="">Kanal</option>
          {Object.entries(CONTACT_CHANNEL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="input !px-2 !py-2 text-xs"
          value={searchParams.get("sort") || "priority"}
          onChange={(e) => setParam("sort", e.target.value)}
        >
          <option value="priority">Sort: Priorität</option>
          <option value="status">Sort: Status</option>
          <option value="publisher">Sort: Publisher (A-Z)</option>
        </select>
      </div>
      <div className="flex overflow-hidden rounded-xl ring-1 ring-stone-700">
        <button
          onClick={() => setParam("view", "list")}
          className={`flex-1 py-2 text-sm ${view === "list" ? "bg-amber-700 text-white" : "bg-stone-900 text-stone-400"}`}
        >
          Liste
        </button>
        <button
          onClick={() => setParam("view", "kanban")}
          className={`flex-1 py-2 text-sm ${view === "kanban" ? "bg-amber-700 text-white" : "bg-stone-900 text-stone-400"}`}
        >
          Kanban
        </button>
      </div>
    </div>
  );
}
