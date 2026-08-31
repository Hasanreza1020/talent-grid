import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import { styles } from "./styles";
import { formatDate, initialsOf } from "@/lib/format";
import type { CompareGroup } from "@/lib/compare";

/**
 * Comparison export, matching the on-screen layout: creators as columns,
 * attributes as rows, with the same best-value marking and the same
 * suppression rule when too much is missing.
 */
export function ComparePdf({
  creators,
  groups,
  summary,
  context,
  generatedOn,
}: {
  creators: { id: string; displayName: string; portraitUrl: string | null }[];
  groups: CompareGroup[];
  summary: string[];
  context: string;
  generatedOn: string;
}) {
  const labelWidth = 26;
  const columnWidth = (100 - labelWidth) / creators.length;

  return (
    <Document title="Creator comparison" author="Talent Grid">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerRule}>
          <Text style={styles.title}>Comparison</Text>
          <Text style={styles.subtitle}>{context}</Text>
        </View>

        {/* Portrait header row */}
        <View style={[styles.row, { marginBottom: 10 }]} wrap={false}>
          <View style={{ width: `${labelWidth}%` }} />
          {creators.map((creator) => (
            <View key={creator.id} style={{ width: `${columnWidth}%`, paddingRight: 8 }}>
              <View style={[styles.portrait, { width: 58, height: 72 }]}>
                {creator.portraitUrl ? (
                  // eslint-disable-next-line jsx-a11y/alt-text -- a PDF drawing primitive, not an HTML img
                  <Image
                    src={creator.portraitUrl}
                    style={{ width: 58, height: 72, objectFit: "cover" }}
                  />
                ) : (
                  <Text style={[styles.initials, { fontSize: 14 }]}>
                    {initialsOf(creator.displayName)}
                  </Text>
                )}
              </View>
              <Text style={[styles.creatorName, { fontSize: 11, marginTop: 4 }]}>
                {creator.displayName}
              </Text>
            </View>
          ))}
        </View>

        {groups.map((group) => (
          <View key={group.key} wrap={false}>
            <Text style={styles.sectionHeading}>{group.label}</Text>
            {group.rows.map((row) => (
              <View key={row.key} style={styles.tableRow}>
                <Text style={[styles.muted, { width: `${labelWidth}%`, paddingRight: 8 }]}>
                  {row.label}
                </Text>
                {row.cells.map((cell) => (
                  <View
                    key={cell.creatorId}
                    style={[
                      { width: `${columnWidth}%`, paddingRight: 8, paddingLeft: 4 },
                      cell.isBest ? styles.bestCell : {},
                    ]}
                  >
                    <Text
                      style={[
                        cell.value !== null && row.direction !== null ? styles.numeral : {},
                        cell.display === "No data" ? styles.muted : {},
                      ]}
                    >
                      {cell.display}
                      {cell.isBest ? "  ●" : ""}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.sectionHeading}>In short</Text>
        {summary.map((sentence) => (
          <Text key={sentence} style={{ marginBottom: 4, lineHeight: 1.5 }}>
            {sentence}
          </Text>
        ))}

        <Text style={styles.footer} fixed>
          Talent Grid, generated {formatDate(generatedOn)}. A filled cell marks the best
          value in that row. Rows where two or more values were missing are left unmarked.
        </Text>
      </Page>
    </Document>
  );
}
