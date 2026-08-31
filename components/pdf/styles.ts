import { StyleSheet } from "@react-pdf/renderer";

/**
 * Print styles.
 *
 * @react-pdf ships Helvetica and Times-Roman built in. Registering Instrument
 * Serif and Inter would mean shipping and loading font binaries at request
 * time; Times-Roman stands in for the display serif and Helvetica for the UI
 * grotesk, which preserves the serif-for-numerals distinction that carries the
 * design without adding a runtime font fetch.
 */
export const PALETTE = {
  canvas: "#FAFAF8",
  surface: "#FFFFFF",
  ink: "#141414",
  inkMuted: "#6B6B68",
  hairline: "#E4E3DF",
  brand: "#FF4D0D",
  brandQuiet: "#FFF1EC",
  stone: "#E8E2DA",
};

export const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 52,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: PALETTE.ink,
    backgroundColor: PALETTE.surface,
  },
  title: { fontFamily: "Times-Roman", fontSize: 24, marginBottom: 4 },
  subtitle: { fontSize: 10, color: PALETTE.inkMuted },
  sectionHeading: {
    fontSize: 8,
    color: PALETTE.inkMuted,
    marginBottom: 6,
    marginTop: 18,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.hairline,
    borderBottomStyle: "solid",
  },
  headerRule: {
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.hairline,
    borderBottomStyle: "solid",
    paddingBottom: 14,
    marginBottom: 18,
  },
  row: { flexDirection: "row" },
  numeral: { fontFamily: "Times-Roman" },
  muted: { color: PALETTE.inkMuted },
  creatorBlock: {
    flexDirection: "row",
    gap: 16,
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.hairline,
    borderBottomStyle: "solid",
  },
  portrait: {
    width: 86,
    height: 107,
    borderRadius: 6,
    backgroundColor: PALETTE.stone,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontFamily: "Times-Roman", fontSize: 20, color: "#8A8A85" },
  creatorName: { fontFamily: "Times-Roman", fontSize: 15, marginBottom: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  chip: {
    borderWidth: 1,
    borderColor: PALETTE.hairline,
    borderStyle: "solid",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 7,
  },
  pitch: {
    marginTop: 8,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: PALETTE.brand,
    borderLeftStyle: "solid",
    fontSize: 9,
    lineHeight: 1.5,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.hairline,
    borderBottomStyle: "solid",
    paddingBottom: 4,
    fontSize: 7,
    color: PALETTE.inkMuted,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.hairline,
    borderBottomStyle: "solid",
    paddingVertical: 4,
  },
  bestCell: { backgroundColor: PALETTE.brandQuiet },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 44,
    right: 44,
    fontSize: 7,
    color: PALETTE.inkMuted,
    borderTopWidth: 1,
    borderTopColor: PALETTE.hairline,
    borderTopStyle: "solid",
    paddingTop: 8,
  },
});
