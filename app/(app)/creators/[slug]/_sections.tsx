import type { getCreatorDetail } from "@/lib/db/creators";
import { MetricValue, SectionHeading, EmptyState, Value } from "@/components/ui-bits";
import { cpm, costPerEngagement } from "@/lib/metrics/cost";
import { DELIVERABLE_LABEL, RATE_PLATFORM_LABEL } from "@/lib/types";
import { formatBdt, formatCompact, formatDate, formatPercent } from "@/lib/format";

type CreatorDetail = NonNullable<Awaited<ReturnType<typeof getCreatorDetail>>>;

export function RateCardSection({
  creator,
  canEdit,
}: {
  creator: CreatorDetail;
  canEdit: boolean;
}) {
  return (
      <section className="mt-12 space-y-4">
        <SectionHeading>Rate card</SectionHeading>
        {!canEdit ? (
          <EmptyState>Rates are visible to editors and admins.</EmptyState>
        ) : creator.rateCards.length === 0 ? (
          <EmptyState>
            No rate card on file. Nothing has been assumed in its place. Rates are
            entered in the CMS.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs text-ink-muted">
                  <th scope="col" className="py-2 pr-4 font-normal">Deliverable</th>
                  <th scope="col" className="py-2 pr-4 font-normal">Platform</th>
                  <th scope="col" className="py-2 pr-4 text-right font-normal">Price</th>
                  <th scope="col" className="py-2 pr-4 font-normal">Negotiable</th>
                  <th scope="col" className="py-2 pr-4 text-right font-normal">CPM</th>
                  <th scope="col" className="py-2 text-right font-normal">Cost per engagement</th>
                </tr>
              </thead>
              <tbody>
                {creator.rateCards.map((rate) => {
                  const engagementInput = {
                    avgViews: creator.primaryAvgViews,
                    avgLikes: creator.primaryAvgLikes,
                    avgComments: creator.primaryAvgComments,
                    avgShares: creator.primaryAvgShares,
                    followers: creator.primaryFollowers,
                  };
                  return (
                    <tr key={rate.id} className="border-b border-hairline">
                      <td className="py-2.5 pr-4">{DELIVERABLE_LABEL[rate.deliverable]}</td>
                      <td className="py-2.5 pr-4">{RATE_PLATFORM_LABEL[rate.platform]}</td>
                      <td className="numeral py-2.5 pr-4 text-right">
                        {formatBdt(rate.priceBdt)}
                      </td>
                      <td className="py-2.5 pr-4">{rate.negotiable ? "Yes" : "No"}</td>
                      <td className="numeral py-2.5 pr-4 text-right">
                        <MetricValue
                          result={cpm(rate.priceBdt, creator.primaryAvgViews)}
                          format={(value: number) => formatBdt(Math.round(value))}
                          label="Cost per mille"
                        />
                      </td>
                      <td className="numeral py-2.5 text-right">
                        <MetricValue
                          result={costPerEngagement(rate.priceBdt, engagementInput)}
                          format={(value: number) => formatBdt(Math.round(value))}
                          label="Cost per engagement"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
  );
}

export function CollaborationsSection({ creator }: { creator: CreatorDetail }) {
  return (
      <section className="mt-12 space-y-4">
        <SectionHeading>Collaboration history</SectionHeading>
        {creator.collaborations.length === 0 ? (
          <EmptyState>No past campaigns recorded.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs text-ink-muted">
                  <th scope="col" className="py-2 pr-4 font-normal">Client</th>
                  <th scope="col" className="py-2 pr-4 font-normal">Campaign</th>
                  <th scope="col" className="py-2 pr-4 font-normal">Ran</th>
                  <th scope="col" className="py-2 pr-4 text-right font-normal">Fee</th>
                  <th scope="col" className="py-2 pr-4 text-right font-normal">Delivered views</th>
                  <th scope="col" className="py-2 text-right font-normal">Delivered ER</th>
                </tr>
              </thead>
              <tbody>
                {creator.collaborations.map((collaboration) => (
                  <tr key={collaboration.id} className="border-b border-hairline">
                    <td className="py-2.5 pr-4">
                      {collaboration.clientName}
                      {!collaboration.wasOurCampaign ? (
                        <span className="block text-xs text-ink-muted">
                          Observed, not brokered by us
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-4"><Value>{collaboration.campaignName}</Value></td>
                    <td className="py-2.5 pr-4">{formatDate(collaboration.ranOn)}</td>
                    <td className="numeral py-2.5 pr-4 text-right">
                      {collaboration.feeVisible ? (
                        formatBdt(collaboration.feeBdt)
                      ) : (
                        <span className="text-xs text-ink-muted">Visible to editors</span>
                      )}
                    </td>
                    <td className="numeral py-2.5 pr-4 text-right">
                      {formatCompact(collaboration.deliveredViews)}
                    </td>
                    <td className="numeral py-2.5 text-right">
                      {formatPercent(collaboration.deliveredEngagementRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
  );
}
