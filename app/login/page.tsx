import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — Talent Grid" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[26rem] flex-col justify-center px-6 py-16">
      <p className="text-sm text-ink-muted">Talent Grid</p>
      <h1 className="mt-2 font-display text-xl">
        {params.mode === "signup" ? "Create an account" : "Sign in"}
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        {params.mode === "signup"
          ? "New accounts start with read-only access. An admin can raise your role once you are in."
          : "The creator database for the team."}
      </p>

      <LoginForm mode={params.mode === "signup" ? "signup" : "signin"} next={params.next} />
    </main>
  );
}
