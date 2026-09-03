import { LoginForm } from "./login-form";
import { Wordmark } from "@/components/chrome/wordmark";

export const metadata = {
  title: "Sign in — Grid",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; denied?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[26rem] flex-col justify-center px-6 py-16">
      <Wordmark />
      <h1 className="mt-2 font-display text-xl">Sign in</h1>

      {params.denied === "1" ? (
        <p role="alert" className="mt-2 text-sm text-warn">
          That account does not have access to this workspace. You have been signed out.
        </p>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">
          This workspace is private. Accounts are created by the owner; there is no
          sign-up.
        </p>
      )}

      <LoginForm next={params.next} />
    </main>
  );
}
