import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import { styles, PALETTE } from "./styles";
import { formatBdt, formatCompact, formatDate, formatPercent, initialsOf, NO_DATA } from "@/lib/format";
import { DELIVERABLE_LABEL, PLATFORM_LABEL, TIER_LABEL } from "@/lib/types";
import type { Deliverable, Platform, Tier } from "@/lib/types";

export type ShortlistPdfCreator = {
  displayName: string;
  portraitUrl: string | null;
  primaryHandle: string | null;
  primaryPlatform: Platform | null;
  city: string | null;
  tier: Tier | null;
  categories: string[];
  pitchNote: string | null;
  accounts: {
    platform: Platform;
    followers: number | null;
    engagementRate: number | null;
  }[];
  rates: { deliverable: Deliverable; priceBdt: number; negotiable: boolean }[] | null;
};

/**
 * Shortlist export. Internal notes and contact details are excluded by
 * default, which is what "by default" means here: they are not passed into
 * this component at all, so there is no path by which they can appear.
 */
export function ShortlistPdf({
  name,
  clientName,
  briefNotes,
  creators,
  includeRates,
  generatedOn,
}: {
  name: string;
  clientName: string | null;
  briefNotes: string | null;
  creators: ShortlistPdfCreator[];
  includeRates: boolean;
  generatedOn: string;
}) {
  return (
    <Document title={name} author="Talent Grid">
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRule}>
          <Text style={styles.title}>{name}</Text>
          {clientName ? (
            <Text style={styles.subtitle}>Prepared for {clientName}</Text>
          ) : null}
          {briefNotes ? (
            <Text style={[styles.subtitle, { marginTop: 6 }]}>{briefNotes}</Text>
          ) : null}
        </View>

        {creators.length === 0 ? (
          <Text style={styles.muted}>This shortlist has no creators on it yet.</Text>
        ) : (
          creators.map((creator, index) => (
            <View key={index} style={styles.creatorBlock} wrap={false}>
              <View style={styles.portrait}>
                {creator.portraitUrl ? (
                  // eslint-disable-next-line jsx-a11y/alt-text -- a PDF drawing primitive, not an HTML img
                  <Image
                    src={creator.portraitUrl}
                    style={{ width: 86, height: 107, objectFit: "cover" }}
                  />
                ) : (
                  <Text style={styles.initials}>{initialsOf(creator.displayName)}</Text>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.creatorName}>{creator.displayName}</Text>
                <Text style={styles.subtitle}>
                  {creator.primaryHandle ? `@${creator.primaryHandle}` : "Handle available on request"}
                  {creator.primaryPlatform
                    ? ` on ${PLATFORM_LABEL[creator.primaryPlatform]}`
                    : ""}
                </Text>

                <View style={styles.chipRow}>
                  {creator.categories.map((category) => (
                    <Text key={category} style={styles.chip}>
                      {category}
                    </Text>
                  ))}
                  {creator.tier ? (
                    <Text style={styles.chip}>{TIER_LABEL[creator.tier]}</Text>
                  ) : null}
                  {creator.city ? <Text style={styles.chip}>{creator.city}</Text> : null}
                </View>

                {creator.pitchNote ? (
                  <Text style={styles.pitch}>{creator.pitchNote}</Text>
                ) : null}

                <View style={{ marginTop: 10 }}>
                  <View style={styles.tableHeader}>
                    <Text style={{ width: "40%" }}>Platform</Text>
                    <Text style={{ width: "30%", textAlign: "right" }}>Followers</Text>
                    <Text style={{ width: "30%", textAlign: "right" }}>Engagement</Text>
                  </View>
                  {creator.accounts.map((account) => (
                    <View key={account.platform} style={styles.tableRow}>
                      <Text style={{ width: "40%" }}>{PLATFORM_LABEL[account.platform]}</Text>
                      <Text style={[styles.numeral, { width: "30%", textAlign: "right" }]}>
                        {formatCompact(account.followers)}
                      </Text>
                      <Text style={[styles.numeral, { width: "30%", textAlign: "right" }]}>
                        {account.engagementRate === null
                          ? NO_DATA
                          : formatPercent(account.engagementRate)}
                      </Text>
                    </View>
                  ))}
                </View>

                {includeRates && creator.rates && creator.rates.length > 0 ? (
                  <View style={{ marginTop: 10 }}>
                    <Text style={[styles.subtitle, { fontSize: 8, marginBottom: 4 }]}>
                      Rates
                    </Text>
                    {creator.rates.map((rate, rateIndex) => (
                      <View key={rateIndex} style={styles.tableRow}>
                        <Text style={{ width: "70%" }}>
                          {DELIVERABLE_LABEL[rate.deliverable]}
                          {rate.negotiable ? " (negotiable)" : ""}
                        </Text>
                        <Text style={[styles.numeral, { width: "30%", textAlign: "right" }]}>
                          {formatBdt(rate.priceBdt)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          ))
        )}

        <Text style={styles.footer} fixed>
          Talent Grid, generated {formatDate(generatedOn)}.
          {includeRates ? " Rates included." : " Rates withheld."} Figures are as recorded
          on the date shown and are not a guarantee of delivery.
        </Text>
      </Page>
    </Document>
  );
}

export { PALETTE };
