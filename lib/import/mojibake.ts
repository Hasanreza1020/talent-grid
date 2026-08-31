/**
 * Repairs text that was written as UTF-8 and then read back as Windows-1252.
 *
 * Spreadsheet exports do this to Bangla names routinely. The bytes for U+09AD
 * (E0 A6 AD) get read one at a time and come out as three Latin characters.
 * Left alone it destroys the name, and it slugifies to nonsense like
 * "a-a-a-a-a-bhojon-roshik".
 *
 * The encoding that matters here is CP1252, not Latin-1. They agree everywhere
 * except bytes 0x80 to 0x9F, which Latin-1 leaves as control characters and
 * CP1252 maps to printable ones: the byte 0x8B arrives as U+2039, and 0x9C as
 * U+0153. A plain Latin-1 round trip cannot recover those, which is why the
 * reverse table below exists.
 *
 * The repair is guarded so it cannot corrupt text that was never broken:
 *
 *   1. Every character must map back to a single byte, either directly (up to
 *      U+00FF) or through the CP1252 table. Anything else is real text that
 *      was decoded correctly.
 *   2. At least one character must be above U+007F, since pure ASCII cannot
 *      be mojibake.
 *   3. Those bytes must decode as strictly valid UTF-8. An acute e on its own
 *      fails, because the lone E9 byte is not a valid sequence, so ordinary
 *      accented Latin text is left alone.
 *   4. The result must contain a character above U+00FF, meaning a genuine
 *      non-Latin script came out the other side.
 *
 * Together these make a false repair very unlikely, and a missed repair merely
 * leaves the text exactly as it arrived.
 */

/** CP1252 code point back to the byte it was decoded from, for 0x80 to 0x9F. */
const CP1252_TO_BYTE = new Map<number, number>([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
  [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);

const LATIN1_MAX = 0xff;
const ASCII_MAX = 0x7f;

export type MojibakeRepair = { text: string; repaired: boolean };

/** The byte this character was decoded from, or null if it was not one. */
function toByte(code: number): number | null {
  if (code <= LATIN1_MAX) return code;
  return CP1252_TO_BYTE.get(code) ?? null;
}

function hasNonLatin1(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) > LATIN1_MAX) return true;
  }
  return false;
}

export function repairMojibake(input: string): MojibakeRepair {
  if (!input) return { text: input, repaired: false };

  const bytes = new Uint8Array(input.length);
  let sawHighCharacter = false;

  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    const byte = toByte(code);
    if (byte === null) return { text: input, repaired: false };
    if (code > ASCII_MAX) sawHighCharacter = true;
    bytes[index] = byte;
  }

  if (!sawHighCharacter) return { text: input, repaired: false };

  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (decoded === input) return { text: input, repaired: false };
    if (!hasNonLatin1(decoded)) return { text: input, repaired: false };
    return { text: decoded, repaired: true };
  } catch {
    // Not valid UTF-8 when read back as bytes, so it was never mojibake.
    return { text: input, repaired: false };
  }
}
