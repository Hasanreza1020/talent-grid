/**
 * Turns an uploaded spreadsheet export into rows.
 *
 * The agency exports both comma- and tab-separated files. The delimiter is
 * detected from the header line rather than from the file extension, because a
 * file named .csv that is actually tab-separated is a normal thing to receive
 * and silently parsing it as one giant column is the worst possible failure.
 */

import { parse } from "csv-parse/sync";
import type { SourceRow } from "./transform";

export function detectDelimiter(text: string): "," | "\t" {
  const header = text.split(/\r?\n/, 1)[0] ?? "";
  const tabs = (header.match(/\t/g) ?? []).length;
  const commas = (header.match(/,/g) ?? []).length;
  return tabs > commas ? "\t" : ",";
}

export function parseSpreadsheet(text: string): {
  rows: SourceRow[];
  delimiter: "," | "\t";
} {
  const delimiter = detectDelimiter(text);
  const rows = parse(text, {
    columns: true,
    delimiter,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    bom: true,
  }) as SourceRow[];

  return { rows, delimiter };
}
