import Link from "next/link";
import { signIn } from "../actions";
import AuthBrand from "../AuthBrand";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-neutral-100">
      <div className="w-full max-w-sm rise">
        <AuthBrand />
        <div className="card p-7">
          <h1 className="text-xl font-semibold tracking-tight">
            Sign in to Resent
          </h1>
          <p className="mt-1 mb-6 text-sm text-neutral-400">
            Your self-hosted email platform
          </p>
          {error && (
            <p className="mb-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          )}
          <form action={signIn} className="space-y-3">
            <input name="email" type="email" required placeholder="you@example.com" className="field" />
            <input name="password" type="password" required placeholder="Password" className="field" />
            <button className="btn-primary w-full">Sign in</button>
          </form>
          <p className="mt-5 text-sm text-neutral-400">
            No account?{" "}
            <Link href="/signup" className="text-indigo-300 underline-offset-2 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
