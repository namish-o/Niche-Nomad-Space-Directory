// "What is here?" lookups against SIMBAD (CDS, Strasbourg) through its TAP service.
// The site calls /simbad/*, which the host forwards to simbad.cds.unistra.fr
// (vercel.json / netlify.toml / vite.config.ts), same as /irsa/*.
// Set VITE_SIMBAD_BASE to call another address instead.

export const SIMBAD_BASE = ((import.meta.env.VITE_SIMBAD_BASE as string | undefined) ?? "/simbad").replace(/\/$/, "");

export interface SimbadObject {
  name: string;
  otype: string;
  ra: number;
  dec: number;
  parallaxMas: number | null;
  spType: string | null;
  redshift: number | null;
  separationArcsec: number;
}

const D2R = Math.PI / 180;

export function angularSeparationDeg(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const s =
    Math.sin(((dec2 - dec1) * D2R) / 2) ** 2 +
    Math.cos(dec1 * D2R) * Math.cos(dec2 * D2R) * Math.sin(((ra2 - ra1) * D2R) / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(s)))) / D2R;
}

/** Objects within `radiusArcmin` of (ra, dec), nearest first. */
export async function coneSearch(ra: number, dec: number, radiusArcmin: number, signal?: AbortSignal): Promise<SimbadObject[]> {
  const r = (radiusArcmin / 60).toFixed(5);
  const pos = `${ra.toFixed(6)}, ${dec.toFixed(6)}`;
  const adql =
    `SELECT TOP 25 main_id, otype, ra, dec, plx_value, sp_type, rvz_redshift, ` +
    `DISTANCE(POINT('ICRS', ra, dec), POINT('ICRS', ${pos})) AS sep ` +
    `FROM basic WHERE CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', ${pos}, ${r})) = 1 ORDER BY sep`;
  const body = new URLSearchParams({ request: "doQuery", lang: "adql", format: "json", query: adql });
  const res = await fetch(`${SIMBAD_BASE}/simbad/sim-tap/sync`, { method: "POST", body, signal });
  if (!res.ok) throw new Error(`SIMBAD answered ${res.status}`);
  return parseTapJson(await res.json());
}

/** SIMBAD TAP JSON ({metadata: [{name}], data: [[...]]}) -> objects. */
export function parseTapJson(json: { metadata: { name: string }[]; data: unknown[][] }): SimbadObject[] {
  const col = (n: string) => json.metadata.findIndex((m) => m.name.toLowerCase() === n);
  const [iName, iType, iRa, iDec, iPlx, iSp, iZ, iSep] = ["main_id", "otype", "ra", "dec", "plx_value", "sp_type", "rvz_redshift", "sep"].map(col);
  const num = (v: unknown) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return json.data.map((row) => ({
    name: cleanName(String(row[iName] ?? "")),
    otype: String(row[iType] ?? "").trim(),
    ra: Number(row[iRa]),
    dec: Number(row[iDec]),
    parallaxMas: num(row[iPlx]),
    spType: str(row[iSp]),
    redshift: num(row[iZ]),
    separationArcsec: (num(row[iSep]) ?? 0) * 3600,
  }));
}

/** "NAME Barnard's star" -> "Barnard's star"; "V* RW Aur" -> "RW Aur". */
export function cleanName(id: string): string {
  return id.replace(/^NAME\s+/, "").replace(/^(V\*|\*|\*\*)\s+/, "").replace(/\s+/g, " ").trim();
}

// SIMBAD object types (short codes and the newer long labels) in plain words.
const TYPES: [string[], string][] = [
  [["BD*", "BrownD*", "BD?", "BrownD*_Candidate"], "brown dwarf, an object too small to shine as a star"],
  [["LM*", "LowMass*"], "low-mass star"],
  [["HPM*", "HighPM*"], "star that moves unusually fast across the sky"],
  [["PM*", "PM*?"], "star with a measurable motion across the sky"],
  [["Mi*", "Mira"], "Mira variable, a pulsating red giant that brightens and fades over months"],
  [["LP*", "LongPeriodV*"], "long-period variable star"],
  [["TT*", "TTauri*", "Or*", "Orion_V*", "YSO", "Y*O"], "very young star, still forming"],
  [["V*", "Variable*"], "variable star whose brightness changes"],
  [["RG*", "RGB*", "RedGiantBranch*"], "red giant star"],
  [["C*", "C*?"], "carbon star, a cool giant rich in carbon"],
  [["WD*", "WhiteDwarf"], "white dwarf, the leftover core of a dead star"],
  [["EB*", "EclBin"], "eclipsing binary, two stars that pass in front of each other"],
  [["SB*", "**", "Binary*", "SB*?"], "double or multiple star system"],
  [["Pl", "Planet"], "planet"],
  [["G", "Galaxy", "GiG", "GiC", "BiC", "IG", "PaG", "GinPair"], "galaxy, a system of billions of stars far beyond the Milky Way"],
  [["QSO", "AGN", "Sy1", "Sy2", "Seyfert", "Blazar", "BLL"], "active galaxy powered by a supermassive black hole"],
  [["ClG", "GrG", "ClusterG", "GroupG"], "group or cluster of galaxies"],
  [["Cl*", "OpC", "OpenCluster", "GlC", "GlobCluster"], "star cluster"],
  [["PN", "PlanetaryNeb"], "planetary nebula, gas thrown off by a dying star"],
  [["HII", "HIIReg"], "cloud of glowing hydrogen where stars are born"],
  [["MoC", "MolCld", "DNe", "DarkNeb", "RNe", "RefNeb", "ISM", "Cld"], "cloud of interstellar gas and dust"],
  [["SNR"], "supernova remnant, debris from an exploded star"],
  [["IR", "Infrared", "MIR", "NIR", "FIR"], "infrared source"],
  [["X", "gam", "Rad", "mR", "cm", "mm", "smm", "UV", "Opt"], "source detected by its light or radio waves, not yet classified"],
  [["*", "Star", "*?"], "star"],
];

export function plainType(otype: string): string {
  for (const [codes, words] of TYPES) if (codes.includes(otype)) return words;
  return `object classed as "${otype}" in SIMBAD`;
}

export function distanceText(o: SimbadObject): string | null {
  if (o.parallaxMas && o.parallaxMas > 0.2) {
    const ly = (1000 / o.parallaxMas) * 3.2616;
    const rounded = ly < 20 ? ly.toFixed(1) : ly < 1000 ? String(Math.round(ly)) : String(Math.round(ly / 100) * 100);
    return `${Number(rounded).toLocaleString("en-US")} light-years`;
  }
  if (o.redshift && o.redshift > 0.003 && o.redshift < 2) {
    // Rough Hubble-law distance, good enough for "how far" at low redshift.
    const mly = (o.redshift * 299792.458) / 70 * 3.2616;
    return mly >= 1000 ? `about ${(mly / 1000).toFixed(1)} billion light-years` : `about ${Math.round(mly)} million light-years`;
  }
  return null;
}

const isPoorName = (n: string) => /^(\[|2MASS|Gaia|WISE[A]? J|TYC|UCAC|SDSS|LEDA|GALEX|USNO)/.test(n);

/** The object worth describing: the nearest one, unless a well-known name sits almost as close. */
export function pickHighlight(objs: SimbadObject[]): SimbadObject | null {
  if (!objs.length) return null;
  const nearest = objs[0];
  if (!isPoorName(nearest.name)) return nearest;
  const named = objs.find((o) => !isPoorName(o.name) && o.separationArcsec < nearest.separationArcsec + 30);
  return named ?? nearest;
}

/** One plain-English sentence about an object. */
export function summarise(o: SimbadObject): string {
  const type = plainType(o.otype);
  const article = /^[aeiou]/i.test(type) ? "an" : "a";
  const dist = distanceText(o);
  const sp = o.spType ? ` Its spectral type is ${o.spType}.` : "";
  const where =
    o.separationArcsec < 5 ? "right at the centre of the view" : `${formatSep(o.separationArcsec)} from the centre of the view`;
  return `${o.name} is ${article} ${type}${dist ? `, about ${dist.replace(/^about /, "")} away` : ""}. It sits ${where}.${sp}`;
}

export function formatSep(arcsec: number): string {
  return arcsec < 60 ? `${Math.round(arcsec)}″` : `${(arcsec / 60).toFixed(1)}′`;
}
