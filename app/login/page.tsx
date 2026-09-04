import { LoginForm } from "./login-form";
import { Wordmark } from "@/components/chrome/wordmark";

export const metadata = {
  title: "Sign in — Grid",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string; denied?: string }>;
}) {
  const params = await searchParams;
  const signup = params.mode === "signup";

  return (
    <main className="mx-auto flex min-h-dvh max-w-[26rem] flex-col justify-center px-6 py-16">
      <Wordmark />
      <h1 className="mt-2 font-display text-xl">
        {signup ? "Create an account" : "Sign in"}
      </h1>

      {params.denied === "1" ? (
        <p role="alert" className="mt-2 text-sm text-warn">
          That account does not have access to this workspace. You have been signed out.
        </p>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">
          {signup
            ? "New accounts start with read-only access. An admin can raise your role once you are in."
            : "The creator database for the team."}
        </p>
      )}

      <LoginForm mode={signup ? "signup" : "signin"} next={params.next} />
    </main>
  );
}
