import Link from "next/link";
import Image from "next/image";
import { Eye, Users } from "lucide-react";
import { collageSize, type CategoryCard } from "@/lib/home/categories";
import { formatCompact, formatNumber, NO_DATA } from "@/lib/format";

/**
 * Categories as collage tiles.
 *
 * Each card is a square of the category's sixteen biggest creators in colour,
 * under a black scrim, with the name and the two figures in white over the
 * middle. The collage is texture, not content: it says "there are people behind
 * this" at a glance, and everything a reader needs is in the text on top.
 *
 * A category with no portraits gets no scrim, and its text stays ink on the
 * surface colour — white on white is the one way this card can fail badly, so
 * the two treatments are chosen together rather than assumed.
 *
 * The scrim is literal black rather than an ink token on purpose. It is
 * darkening a photograph, not painting a surface, and it should not follow the
 * page if a dark theme is ever added.
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

  const hasCollage = perSide > 0;

  return (
    <Link
      href={`/creators?category=${card.slug}`}
      aria-label={`${card.name}, ${formatNumber(card.creatorCount)} creators, ${reach} reach`}
      className={`group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
        hasCollage ? "border-transparent text-white" : "border-hairline bg-surface text-ink"
      }`}
    >
      {hasCollage ? (
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
                  className="object-cover"
                />
              </span>
            ))}
          </div>

          {/*
            The scrim. Heavy enough to carry white text at full contrast over
            whatever the brightest photograph in the set turns out to be, and
            it lifts on hover so the faces come forward — one change, no lift,
            no shadow, no scale. Reduced motion drops the transition through the
            global rule in globals.css.
          */}
          <div
            aria-hidden
            className="absolute inset-0 bg-black/60 transition-colors duration-200 group-hover:bg-black/45"
          />
        </>
      ) : null}

      <span className="relative flex flex-col items-center gap-3 px-2 text-center">
        <span className="font-display text-xl leading-tight">{card.name}</span>

        <span className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <Users
              aria-hidden
              className={`size-3.5 ${hasCollage ? "text-white/60" : "text-ink-muted"}`}
            />
            <span className="numeral">{formatNumber(card.creatorCount)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Eye
              aria-hidden
              className={`size-3.5 ${hasCollage ? "text-white/60" : "text-ink-muted"}`}
            />
            <span
              className={
                card.reach === null
                  ? `text-xs ${hasCollage ? "text-white/60" : "text-ink-muted"}`
                  : "numeral"
              }
            >
              {reach}
            </span>
          </span>
        </span>
      </span>
    </Link>
  );
}
