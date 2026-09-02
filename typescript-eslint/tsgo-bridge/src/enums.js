/** Remaps enum values from tsgo numbering to the Strada `typescript` numbering that lint rules compare against. */

function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0;
}

/** Bit-flag remapper tsgo -> Strada built from single-bit member names. */
function buildFlagRemap(stradaEnum, tsgoEnum, name) {
  const table = new Map();
  const missing = [];
  for (const [member, tsgoValue] of Object.entries(tsgoEnum)) {
    if (typeof tsgoValue !== "number" || !isPowerOfTwo(tsgoValue)) {
      continue;
    }
    const stradaValue = stradaEnum[member];
    if (typeof stradaValue !== "number") {
      missing.push(member);
      continue;
    }
    if (!table.has(tsgoValue)) {
      table.set(tsgoValue, stradaValue);
    }
  }
  const remap = (flags) => {
    if (!flags) {
      return 0;
    }
    let out = 0;
    let rest = flags >>> 0;
    while (rest) {
      const bit = rest & -rest;
      const mapped = table.get(bit);
      if (mapped !== undefined) {
        out |= mapped;
      }
      rest ^= bit;
    }
    return out;
  };
  remap.missing = missing;
  remap.enumName = name;
  return remap;
}

/** Ordinal remapper tsgo -> Strada (and back) via member names. */
function buildOrdinalRemap(stradaEnum, tsgoEnum, name) {
  const table = [];
  const reverse = new Map();
  const missing = [];
  for (const [member, tsgoValue] of Object.entries(tsgoEnum)) {
    if (typeof tsgoValue !== "number") {
      continue;
    }
    if (/^(First|Last|Count)/.test(member)) {
      continue;
    }
    const stradaValue = stradaEnum[member];
    if (typeof stradaValue !== "number") {
      missing.push(member);
      continue;
    }
    table[tsgoValue] = stradaValue;
    if (!reverse.has(stradaValue)) {
      reverse.set(stradaValue, tsgoValue);
    }
  }
  const remap = (kind) => table[kind] ?? -1;
  remap.toTsgo = (kind) => reverse.get(kind) ?? -1;
  remap.missing = missing;
  remap.enumName = name;
  return remap;
}

/** `ts` is the Strada module the rules import; `tsgoSync`/`tsgoAst` are `typescript/unstable/{sync,ast}` of the native package. */
export function createEnumRemaps({ ts, tsgoSync, tsgoAst }) {
  return {
    syntaxKind: buildOrdinalRemap(ts.SyntaxKind, tsgoAst.SyntaxKind, "SyntaxKind"),
    typeFlags: buildFlagRemap(ts.TypeFlags, tsgoSync.TypeFlags, "TypeFlags"),
    objectFlags: buildFlagRemap(ts.ObjectFlags, tsgoSync.ObjectFlags, "ObjectFlags"),
    symbolFlags: buildFlagRemap(ts.SymbolFlags, tsgoSync.SymbolFlags, "SymbolFlags"),
    nodeFlags: buildFlagRemap(ts.NodeFlags, tsgoAst.NodeFlags, "NodeFlags"),
    modifierFlags: buildFlagRemap(ts.ModifierFlags, tsgoAst.ModifierFlags, "ModifierFlags"),
    signatureKindToTsgo: (kind) => tsgoSync.SignatureKind[ts.SignatureKind[kind]],
  };
}
