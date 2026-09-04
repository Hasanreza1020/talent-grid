import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { publicCreator } from "@/lib/public/directory";
import { PlatformIcon } from "@/components/platform-icon";
import { formatCompact, initialsOf } from "@/lib/format";
import { PLATFORM_LABEL } from "@/lib/types";

/*
  Rendered per request rather than at build time. Prerendering would tie a
  deploy to the database being reachable and migrated, so a build during a
  migration — or before one — fails for a page that has no reason to.
*/
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const creator = await publicCreator(slug);
  return { title: creator?.name ?? "Creator" };
}

export default async function PublicCreatorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const creator = await publicCreator(slug);
  if (!creator) notFound();

  const total = creator.platforms.reduce<number | null>((sum, entry) => {
    if (entry.followers === null) return sum;
    return (sum ?? 0) + entry.followers;
  }, null);

  return (
    <div className="mx-auto max-w-[64rem] px-6 py-12">
      <Link
        href="/creators"
        className="inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" />
        All creators
      </Link>

      <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-[minmax(0,260px)_1fr]">
        <span className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-white/5">
          {creator.portraitUrl ? (
            <Image
              src={creator.portraitUrl}
              alt=""
              fill
              priority
              sizes="260px"
              className="object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center font-display text-2xl text-white/30">
              {initialsOf(creator.name)}
            </span>
          )}
        </span>

        <div className="min-w-0">
          <h1 className="font-display text-2xl leading-tight sm:text-3xl">{creator.name}</h1>
          <p className="mt-2 text-sm text-white/50">
            {creator.category ?? "Uncategorised"}
            {creator.city ? ` · ${creator.city}` : ""}
          </p>

          {creator.bio ? (
            <p className="mt-5 max-w-[40rem] text-base leading-relaxed text-white/70">
              {creator.bio}
            </p>
          ) : null}

          <p className="numeral mt-8 text-3xl font-light leading-none tracking-tight">
            {total === null ? "—" : formatCompact(total)}
          </p>
          <p className="mt-2 text-xs text-white/45">Followers across platforms</p>

          {creator.platforms.length > 0 ? (
            <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
              {creator.platforms.map((entry) => (
                <li
                  key={entry.platform}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <span className="flex items-center gap-2.5 text-sm">
                    <PlatformIcon platform={entry.platform} className="size-4 text-white/45" />
                    {entry.url ? (
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noreferrer nofollow"
                        className="transition-colors hover:text-brand"
                      >
                        {entry.handle ? `@${entry.handle}` : PLATFORM_LABEL[entry.platform]}
                      </a>
                    ) : (
                      <span>
                        {entry.handle ? `@${entry.handle}` : PLATFORM_LABEL[entry.platform]}
                      </span>
                    )}
                  </span>
                  <span className="numeral text-sm">
                    {entry.followers === null ? (
                      <span className="text-xs text-white/40">Not on file</span>
                    ) : (
                      formatCompact(entry.followers)
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="sg-solid mt-8 rounded-xl p-5">
            <p className="text-sm text-white/70">
              Rate card, engagement rate and contact details are held in the working
              product.
            </p>
            <a
              href={`mailto:hello@onetech.com.bd?subject=${encodeURIComponent(`Grid — ${creator.name}`)}`}
              className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium transition-colors hover:bg-[#ff6a24]"
            >
              Ask about {creator.name.split(/\s+/)[0]}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
