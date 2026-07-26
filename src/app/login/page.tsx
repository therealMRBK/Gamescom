import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/dashboard",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect("/login?error=1");
      }
      throw err;
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-950 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-stone-900 p-6 shadow-xl ring-1 ring-stone-800">
        <div className="mb-6 text-center">
          <p className="font-console text-sm font-medium tracking-wide text-amber-500">
            GAMESCOM 2026
          </p>
          <h1 className="mt-1 text-xl font-bold text-white">
            Command Center
          </h1>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300 ring-1 ring-red-900">
            Login fehlgeschlagen. E-Mail oder Passwort prüfen.
          </p>
        )}

        <form action={login} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-stone-300">
              E-Mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-stone-700 bg-stone-800 px-4 py-3 text-base text-white outline-none focus:border-amber-600"
              placeholder="team@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-stone-300">
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-stone-700 bg-stone-800 px-4 py-3 text-base text-white outline-none focus:border-amber-600"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-amber-700 px-4 py-3 text-base font-semibold text-white transition active:scale-[0.98]"
          >
            Anmelden
          </button>
        </form>
      </div>
    </div>
  );
}
