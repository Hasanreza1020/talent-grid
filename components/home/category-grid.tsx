import Link from "next/link";
import Image from "next/image";
import { collageSize, type CategoryCard } from "@/lib/home/categories";
import { formatCompact, formatNumber, NO_DATA } from "@/lib/format";

/**
 * Categories as collage tiles.
 *
 * Each card is a square of the category's sixteen biggest creators, greyed and
 * washed out under the surface colour until the faces are barely there. The
 * collage is texture, not content: it says "there are people behind this" at a
 * glance, and everything a reader actually needs is in the text on top.
 *
 * The wash is painted with the surface token rather than a literal white, so
 * the card inverts with the rest of the product if a dark theme is added
 * instead of turning into a bright block on a dark page.
 */
export function CategoryGrid({ cards }: { cards: CategoryCard[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card, index) => (
        <li key={card.id}>
          <CategoryTile card={card} eager={index < 4} />
        </li>
      ))}
    </ul>
  );
}

function CategoryTile({ card, eager }: { card: CategoryCard; eager: boolean }) {
  const size = collageSize(card.portraits.length);
  const perSide = size === 16 ? 4 : size === 9 ? 3 : size === 4 ? 2 : 0;
  const tiles = card.portraits.slice(0, size);

  const reach = card.reach === null ? NO_DATA : formatCompact(card.reach);

  return (
    <Link
      href={`/creators?category=${card.slug}`}
      aria-label={`${card.name}, ${formatNumber(card.creatorCount)} creators, ${reach} reach`}
      className="group relative flex aspect-square flex-col justify-between overflow-hidden rounded-xl border border-hairline bg-surface p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {perSide > 0 ? (
        <>
          <div
            aria-hidden
            className="absolute inset-0 grid"
            style={{ gridTemplateColumns: `repeat(${perSide}, 1fr)` }}
          >
            {tiles.map((url, index) => (
              <span key={`${url}-${index}`} className="relative block bg-stone">
                <Image
                  src={url}
                  alt=""
                  fill
                  // A tile is a quarter of a card that is at most ~300px wide.
                  sizes="80px"
                  loading={eager ? undefined : "lazy"}
                  priority={false}
                  className="object-cover grayscale"
                />
              </span>
            ))}
          </div>

          {/*
            The wash. Sits above the collage and below the text, and lifts a
            little on hover so the faces surface — one change, no lift, no
            shadow, no scale. The transition is dropped under reduced motion by
            the global rule in globals.css.
          */}
          <div
            aria-hidden
            className="absolute inset-0 bg-surface/85 transition-colors duration-200 group-hover:bg-surface/70"
          />
        </>
      ) : null}

      <span className="relative flex flex-1 items-center justify-center px-2 text-center">
        <span className="font-display text-xl leading-tight">{card.name}</span>
      </span>

      <span className="relative flex items-baseline gap-4 text-sm">
        <span className="flex items-baseline gap-1.5">
          <span className="numeral">{formatNumber(card.creatorCount)}</span>
          <span className="text-xs text-ink-muted">creators</span>
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className={card.reach === null ? "text-xs text-ink-muted" : "numeral"}>
            {reach}
          </span>
          {card.reach === null ? null : (
            <span className="text-xs text-ink-muted">reach</span>
          )}
        </span>
      </span>
    </Link>
  );
}
