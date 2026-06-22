import Link from "next/link";
import { signUp } from "../actions";
import AuthBrand from "../AuthBrand";

export default async function SignupPage({
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
            Create your account
          </h1>
          <p className="mt-1 mb-6 text-sm text-neutral-400">Start sending email</p>
          {error && (
            <p className="mb-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          )}
          <form action={signUp} className="space-y-3">
            <input name="email" type="email" required placeholder="you@example.com" className="field" />
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Password (min 6 chars)"
              className="field"
            />
            <button className="btn-primary w-full">Sign up</button>
          </form>
          <p className="mt-5 text-sm text-neutral-400">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-300 underline-offset-2 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
