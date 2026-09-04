import Link from "next/link";
import Image from "next/image";
import { publicCategories, publicDirectory } from "@/lib/public/directory";
import { PlatformIcon } from "@/components/platform-icon";
import { formatCompact, formatNumber, initialsOf } from "@/lib/format";
import { PLATFORM_LABEL } from "@/lib/types";

/*
  Rendered per request rather than at build time. Prerendering would tie a
  deploy to the database being reachable and migrated, so a build during a
  migration — or before one — fails for a page that has no reason to.
*/
export const dynamic = "force-dynamic";
export const metadata = { title: "Creators" };

export default async function PublicCreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const [all, categories] = await Promise.all([publicDirectory(), publicCategories()]);

  const chosen = categories.find((entry) => entry.slug === category) ?? null;
  const creators = chosen ? all.filter((c) => c.categorySlug === chosen.slug) : all;

  return (
    <div className="mx-auto max-w-[80rem] px-6 py-12">
      <h1 className="font-display text-2xl sm:text-3xl">
        {chosen ? chosen.name : "The roster"}
      </h1>
      <p className="mt-2 text-sm text-white/50">
        {formatNumber(creators.length)} creators
        {chosen ? ` filed under ${chosen.name.toLowerCase()}` : " on file"}. Follower
        counts are read from the platforms; rates and contacts are shared on request.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Filter by category">
        <Chip href="/creators" active={!chosen}>
          All
        </Chip>
        {categories.map((entry) => (
          <Chip
            key={entry.slug}
            href={`/creators?category=${entry.slug}`}
            active={chosen?.slug === entry.slug}
          >
            {entry.name}
          </Chip>
        ))}
      </nav>

      {creators.length === 0 ? (
        <p className="py-16 text-sm text-white/50">
          Nobody is filed under that category yet.
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {creators.map((creator) => (
            <li key={creator.slug}>
              <Link href={`/creators/${creator.slug}`} className="group block">
                <span className="relative block aspect-[4/5] overflow-hidden rounded-xl bg-white/5">
                  {creator.portraitUrl ? (
                    <Image
                      src={creator.portraitUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 200px, 45vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center font-display text-lg text-white/30">
                      {initialsOf(creator.name)}
                    </span>
                  )}
                </span>

                <p className="mt-2 truncate text-sm">{creator.name}</p>
                <p className="truncate text-xs text-white/40">
                  {creator.category ?? "Uncategorised"}
                  {creator.city ? ` · ${creator.city}` : ""}
                </p>

                <p className="numeral mt-1.5 text-sm">
                  {creator.totalReach === null ? (
                    <span className="text-xs text-white/40">Not on file</span>
                  ) : (
                    formatCompact(creator.totalReach)
                  )}
                </p>

                <span className="mt-1.5 flex items-center gap-1.5 text-white/35">
                  {creator.platforms.map((entry) => (
                    <span key={entry.platform}>
                      <PlatformIcon platform={entry.platform} className="size-3.5" />
                      <span className="sr-only">{PLATFORM_LABEL[entry.platform]}</span>
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        active
          ? "border-brand bg-brand/15 text-white"
          : "border-white/15 text-white/60 hover:border-white/30 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
