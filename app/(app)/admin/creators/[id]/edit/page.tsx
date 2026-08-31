import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCreatorDetail } from "@/lib/db/creators";
import { listCategories, listTags } from "@/lib/db/categories";
import { CreatorForm } from "@/components/admin/creator-form";
import { PortraitUpload } from "@/components/admin/portrait-upload";
import { SnapshotEntry } from "@/components/admin/snapshot-entry";
import { ArchiveCreator } from "@/components/admin/archive-creator";
import { SectionHeading } from "@/components/ui-bits";
import { PLATFORM_LABEL } from "@/lib/types";
import type { CreatorFormValues } from "@/lib/schemas";

export const metadata = { title: "Edit creator — Talent Grid" };

export default async function EditCreatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { id } = await params;
  const { step } = await searchParams;

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("creators")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  if (!row) notFound();

  const [creator, categories, tags] = await Promise.all([
    getCreatorDetail(row.slug),
    listCategories(),
    listTags(),
  ]);

  if (!creator) notFound();

  const byId = new Map(categories.map((category) => [category.id, category]));

  const initialValues: CreatorFormValues = {
    identity: {
      displayName: creator.displayName,
      legalName: creator.legalName,
      bioShort: creator.bioShort,
      bioLong: creator.bioLong,
      city: creator.city,
      country: creator.country,
      gender: creator.gender,
      primaryLanguage: creator.primaryLanguage,
      status: creator.status,
      dataConfidence: creator.dataConfidence,
      acceptsBarter: creator.acceptsBarter,
      typicalTurnaroundDays: creator.typicalTurnaroundDays,
    },
    accounts: creator.accounts.map((account) => ({
      platform: account.platform,
      handle: account.handle,
      profileUrl: account.profileUrl,
      verifiedBadge: account.verifiedBadge,
    })),
    categories: {
      primaryCategoryId: creator.categories.find((category) => category.isPrimary)?.id ?? "",
      secondaryCategoryIds: creator.categories
        .filter((category) => !category.isPrimary)
        .map((category) => category.id),
      tagIds: creator.tags.map((tag) => tag.id),
    },
    rates: creator.rateCards.map((rate) => ({
      platform: rate.platform,
      deliverable: rate.deliverable,
      priceBdt: rate.priceBdt,
      negotiable: rate.negotiable,
      notes: rate.notes,
      effectiveFrom: rate.effectiveFrom,
    })),
    contacts: creator.contacts.map((contact) => ({
      contactType: contact.contactType,
      name: contact.name,
      phone: contact.phone,
      whatsapp: contact.whatsapp,
      email: contact.email,
      preferredChannel: contact.preferredChannel,
      isPrimary: contact.isPrimary,
    })),
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-lg">{creator.displayName}</h2>
        <Link
          href={`/creators/${creator.slug}`}
          className="text-sm text-ink-muted hover:text-ink"
        >
          View the public record
        </Link>
      </div>

      <CreatorForm
        creatorId={creator.id}
        initialValues={initialValues}
        initialStep={step}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          parentName: category.parentId ? (byId.get(category.parentId)?.name ?? null) : null,
        }))}
        tags={tags}
      />

      <section className="space-y-4">
        <SectionHeading>Portrait</SectionHeading>
        <PortraitUpload
          creatorId={creator.id}
          creatorName={creator.displayName}
          currentUrl={creator.portraitUrl}
        />
      </section>

      <section className="space-y-4">
        <SectionHeading>Record a follower snapshot</SectionHeading>
        <SnapshotEntry
          creatorId={creator.id}
          accounts={creator.accounts.map((account) => ({
            id: account.id,
            label: PLATFORM_LABEL[account.platform],
            lastCaptured: account.latest?.capturedOn ?? null,
          }))}
        />
      </section>

      <section className="space-y-4">
        <SectionHeading>Archive</SectionHeading>
        <ArchiveCreator creatorId={creator.id} creatorName={creator.displayName} />
      </section>
    </div>
  );
}
