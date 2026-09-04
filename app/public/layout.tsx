import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/chrome/wordmark";

export const metadata: Metadata = {
  title: { default: "Grid — the creator database", template: "%s — Grid" },
  description:
    "A working database of creators in Bangladesh, with real follower counts. Built by One Tech.",
  robots: { index: true, follow: true },
};

/**
 * The showcase shell.
 *
 * No session, no sign-in form, no sign-up link — there is nothing here for a
 * visitor to create an account with, which is the point. The single call to
 * action is an email address, because access to the real product is something
 * a person grants rather than something a form does.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sg-page flex min-h-dvh flex-col text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#060505]/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[80rem] items-center gap-4 px-4 text-white sm:px-6 lg:gap-8">
          <Wordmark href="/" />

          <nav className="hidden items-center gap-6 text-sm md:flex">
            <Link href="/creators" className="text-white/60 transition-colors hover:text-white">
              Creators
            </Link>
            <Link
              href="/strategiser"
              className="text-white/60 transition-colors hover:text-white"
            >
              Strategiser
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/creators"
              className="text-sm text-white/60 transition-colors hover:text-white md:hidden"
            >
              Creators
            </Link>
            <a
              href="mailto:hello@onetech.com.bd?subject=Grid%20access"
              className="rounded-lg bg-brand px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#ff6a24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Request access
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-[80rem] flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-white/40 sm:px-6">
          <p>Grid — a product of One Tech.</p>
          <p>
            Follower counts are read from the platforms and dated. Rates and contacts are
            shared on request.
          </p>
        </div>
      </footer>
    </div>
  );
}
