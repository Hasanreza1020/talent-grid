import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { publicCategories, publicDirectory } from "@/lib/public/directory";
import { formatCompact, formatNumber } from "@/lib/format";

/*
  Rendered per request rather than at build time. Prerendering would tie a
  deploy to the database being reachable and migrated, so a build during a
  migration — or before one — fails for a page that has no reason to.
*/
export const dynamic = "force-dynamic";

export default async function PublicHomePage() {
  const [creators, categories] = await Promise.all([publicDirectory(), publicCategories()]);

  const reach = creators.reduce<number>((sum, c) => sum + (c.totalReach ?? 0), 0);
  const featured = creators.filter((c) => c.portraitUrl).slice(0, 12);

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div className="sg-ambient" />
        <div className="sg-grain" />

        <div className="relative mx-auto max-w-[52rem] px-6 py-24 text-center sm:py-32">
          <h1 className="font-display text-3xl leading-tight sm:text-5xl">
            Every creator worth knowing, in one place.
          </h1>
          <p className="mx-auto mt-5 max-w-[36rem] text-base leading-relaxed text-white/60">
            {formatNumber(creators.length)} creators across Bangladesh, with follower
            counts read from the platforms rather than guessed at. Browse the roster
            below, then talk to us about the rest.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/creators"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[#ff6a24]"
            >
              Browse the roster
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/strategiser"
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm transition-colors hover:border-white/40"
            >
              Try the strategiser
            </Link>
          </div>

          <dl className="mx-auto mt-16 grid max-w-[34rem] grid-cols-3 gap-6 border-y border-white/10 py-8">
            <Stat value={formatNumber(creators.length)} label="creators" />
            <Stat value={formatCompact(reach)} label="combined reach" />
            <Stat value={formatNumber(categories.length)} label="categories" />
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-[80rem] px-6 py-16">
        <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3">
          <h2 className="text-lg">Categories</h2>
          <Link href="/creators" className="text-sm text-white/50 hover:text-white">
            Browse all
          </Link>
        </div>

        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/creators?category=${category.slug}`}
                className="sg-solid block rounded-xl p-4 transition-colors hover:border-brand"
              >
                <p className="text-base">{category.name}</p>
                <p className="numeral mt-1 text-sm text-white/45">
                  {formatNumber(category.creatorCount)} creators
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {featured.length > 0 ? (
        <section className="mx-auto max-w-[80rem] px-6 pb-20">
          <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3">
            <h2 className="text-lg">Biggest reach</h2>
            <Link href="/creators" className="text-sm text-white/50 hover:text-white">
              See all
            </Link>
          </div>

          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {featured.map((creator) => (
              <li key={creator.slug}>
                <Link href={`/creators/${creator.slug}`} className="group block">
                  <span className="relative block aspect-[4/5] overflow-hidden rounded-xl bg-white/5">
                    {creator.portraitUrl ? (
                      <Image
                        src={creator.portraitUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 180px, 40vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : null}
                  </span>
                  <p className="mt-2 truncate text-sm">{creator.name}</p>
                  <p className="numeral text-xs text-white/45">
                    {creator.totalReach === null
                      ? "Not on file"
                      : `${formatCompact(creator.totalReach)} followers`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mx-auto max-w-[80rem] px-6 pb-24">
        <div className="sg-solid rounded-2xl p-8 text-center sm:p-12">
          <h2 className="font-display text-2xl">Rates, contacts and engagement</h2>
          <p className="mx-auto mt-3 max-w-[34rem] text-sm leading-relaxed text-white/55">
            Those live in the working product, not on this page. Tell us what you are
            planning and we will send the shortlist with the numbers attached.
          </p>
          <a
            href="mailto:hello@onetech.com.bd?subject=Grid%20access"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[#ff6a24]"
          >
            Request access
            <ArrowRight className="size-4" />
          </a>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="numeral block text-2xl font-light leading-none tracking-tight">
          {value}
        </span>
        <span className="mt-2 block text-xs text-white/45">{label}</span>
      </dd>
    </div>
  );
}
