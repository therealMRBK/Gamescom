/**
 * Next.js strips thrown Server Action error messages in production builds
 * (see docs/01-app/01-getting-started/10-error-handling.md: "avoid using
 * try/catch blocks and throw errors [for expected errors]. Instead, model
 * expected errors as return values."). Fallible actions use this wrapper so
 * the client still gets the actual message outside development.
 */
export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: string };

export async function toActionResult<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler." };
  }
}
