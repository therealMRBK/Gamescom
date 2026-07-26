"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white"
    >
      🖨️ Als PDF drucken/speichern
    </button>
  );
}
