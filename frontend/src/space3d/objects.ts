// What the 3D map shows: the challenge targets plus a few famous stars so
// people have something familiar to steer by. Distances are in light-years.
import { TARGETS } from "../data/targets";
import { curatedNear } from "../describe/curated";

export type Category = "movers" | "variables" | "landmarks" | "imap" | "solar";

export const CATEGORIES: { id: Category; label: string; color: string }[] = [
  { id: "movers", label: "Fast movers", color: "--color-accent" },
  { id: "variables", label: "Variable stars", color: "--color-cool" },
  { id: "landmarks", label: "Familiar stars", color: "--color-muted" },
  { id: "imap", label: "IMAP: our heliosphere", color: "--color-sky-mw" },
  { id: "solar", label: "Planets", color: "--color-sky-ecliptic" },
];

export interface MapObject {
  id: string;
  name: string;
  category: Category;
  ra: number;
  dec: number;
  ly: number;
  kind: string;
  note: string;
  band?: number;
  /** Fixed map position, for things that are a direction rather than a star. */
  at?: [number, number, number];
  /** Replaces the "N light-years from the Sun" line. */
  distText?: string;
  /** Not something to open in the sky viewer. */
  noViewer?: boolean;
}

// The curated text gives rounded distances; these are the numbers we plot.
const TARGET_LY: Record<string, number> = { wise0855: 7.4, barnard: 6, epsindb: 11.9, rwaur: 500, rdra: 2000 };
const TARGET_CAT: Record<string, Category> = {
  wise0855: "movers", barnard: "movers", epsindb: "movers", rwaur: "variables", rdra: "variables",
};

const targets: MapObject[] = TARGETS.map((t) => {
  const c = curatedNear(t.ra, t.dec);
  return {
    id: t.id, name: t.name, category: TARGET_CAT[t.id] ?? "movers",
    ra: t.ra, dec: t.dec, ly: TARGET_LY[t.id] ?? 100,
    kind: c?.kind ?? "Challenge target", note: c?.text ?? t.note, band: t.suggested_band,
  };
});

const landmarks: MapObject[] = [
  { id: "alphacen", name: "Alpha Centauri", ra: 219.9, dec: -60.835, ly: 4.37, kind: "Closest star system", note: "Three stars, including Proxima Centauri, the closest star to the Sun." },
  { id: "sirius", name: "Sirius", ra: 101.287, dec: -16.716, ly: 8.6, kind: "Brightest star at night", note: "A hot white star with a tiny white dwarf partner." },
  { id: "vega", name: "Vega", ra: 279.235, dec: 38.784, ly: 25, kind: "Bright summer star", note: "A young blue-white star ringed by dust, the zero point of many brightness scales." },
  { id: "betelgeuse", name: "Betelgeuse", ra: 88.793, dec: 7.407, ly: 550, kind: "Red supergiant", note: "Orion's shoulder. A huge, cool star near the end of its life." },
].map((o) => ({ ...o, category: "landmarks" as const }));

/** Ecliptic longitude/latitude (degrees) to RA/Dec (J2000). */
function eclToEq(lon: number, lat: number): { ra: number; dec: number } {
  const r = Math.PI / 180, e = 23.4393 * r, l = lon * r, b = lat * r;
  const ra = Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
  const dec = Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
  return { ra: ((ra / r) % 360 + 360) % 360, dec: dec / r };
}

/** Interstellar neutral inflow directions, ecliptic J2000, as quoted in the
 *  IMAP science processing code (IMAP-Science-Operations-Center/imap_processing,
 *  docs/source/algorithm-code-documentation/swapi/overview.rst):
 *  helium from (255.7, 5.1) at 25.4 km/s, hydrogen from (252.2, 9.0) at 22 km/s. */
export const UPWIND = eclToEq(255.7, 5.1);
export const UPWIND_H = eclToEq(252.2, 9.0);
/** Heliosphere nose radius on the map. The real one (~120 au) would be a
 *  speck, so it is drawn enlarged. */
export const HELIO_R = 1.1;

const unit = (ra: number, dec: number): [number, number, number] => {
  const a = (ra * Math.PI) / 180, d = (dec * Math.PI) / 180;
  return [Math.cos(d) * Math.cos(a), Math.sin(d), -Math.cos(d) * Math.sin(a)];
};
export const UPWIND_DIR = unit(UPWIND.ra, UPWIND.dec);
export const UPWIND_H_DIR = unit(UPWIND_H.ra, UPWIND_H.dec);
const along = (k: number) => UPWIND_DIR.map((c) => c * k) as [number, number, number];

const imap: MapObject[] = [
  {
    id: "heliosphere", name: "Heliosphere", category: "imap", ...UPWIND, ly: 0.0019, at: along(HELIO_R),
    kind: "The Sun's bubble (drawn enlarged)", distText: "Nose about 120 au away, 0.002 light-years",
    note: "The solar wind blows a bubble into the gas between the stars. Its edge, the heliopause, is about 120 au " +
      "from the Sun on the side facing the interstellar wind, with a long tail behind. NASA's IMAP, parked near " +
      "the Sun-Earth L1 point, maps this edge by catching neutral atoms that fly in from it.",
    noViewer: true,
  },
  {
    id: "isnwind", name: "Interstellar wind", category: "imap", ...UPWIND, ly: 0, at: along(4.2),
    kind: "Direction, not a star", distText: "Helium at 25.4 km/s, hydrogen at 22 km/s",
    note: "The Sun moves through a thin interstellar cloud, so its atoms stream past us like a wind. This arrow " +
      "points to where it comes from, in Ophiuchus. The brighter arrow is helium, the fainter one hydrogen, which " +
      "gets bent a little on its way in. The directions come from IMAP's own processing code; IMAP-Lo and SWAPI " +
      "sample these atoms to learn what the cloud is made of. Open it in the viewer to see that patch of sky.",
  },
];

// Solar system view: planets on circular orbits from mean J2000 elements, placed
// for today. Good to a few degrees, which is plenty at this scale.
// [name, semi-major axis au, mean longitude at J2000 deg, period days, note]
const PLANETS: [string, number, number, number, string][] = [
  ["Mercury", 0.387, 252.25, 87.97, "Smallest planet and closest to the Sun. A year lasts 88 days."],
  ["Venus", 0.723, 181.98, 224.7, "Wrapped in thick clouds, the hottest planet."],
  ["Earth", 1, 100.46, 365.256, "Home. SPHEREx orbits Earth, and IMAP sits 1.5 million km sunward of it at the L1 point."],
  ["Mars", 1.524, 355.45, 686.98, "The red planet, half Earth's width."],
  ["Jupiter", 5.203, 34.4, 4332.59, "The biggest planet, more than twice the mass of all the others together."],
  ["Saturn", 9.537, 49.94, 10759.22, "The ringed gas giant."],
  ["Uranus", 19.19, 313.23, 30688.5, "Ice giant that spins on its side."],
  ["Neptune", 30.07, 304.88, 60182, "Farthest planet, 30 times Earth's distance from the Sun."],
];
/** Planet orbit radius on the map (square root so Mercury and Neptune both fit). */
export const scaleAu = (au: number) => 3 * Math.sqrt(au);
const OBLIQUITY = 23.4393 * (Math.PI / 180);
/** Point in the ecliptic plane (longitude deg, map radius) to map x/y/z. */
export function eclipticPoint(lonDeg: number, r: number): [number, number, number] {
  const l = (lonDeg * Math.PI) / 180;
  const x = r * Math.cos(l), ye = r * Math.sin(l);
  // ecliptic -> equatorial, then into the map's axes (y = north, z = -y_eq)
  return [x, ye * Math.sin(OBLIQUITY), -ye * Math.cos(OBLIQUITY)];
}
const daysSinceJ2000 = (Date.now() - Date.UTC(2000, 0, 1, 12)) / 86400000;
export const PLANET_ORBITS = PLANETS.map(([, au]) => scaleAu(au));
const planets: MapObject[] = PLANETS.map(([name, au, l0, period, note]) => {
  const lon = (l0 + (360 * daysSinceJ2000) / period) % 360;
  const at = eclipticPoint(lon, scaleAu(au));
  return {
    id: name.toLowerCase(), name, category: "solar", ra: 0, dec: 0, ly: au / 63241, at,
    kind: "Planet", distText: `${au} au from the Sun (${(au * 8.317).toFixed(au < 2 ? 1 : 0)} light-minutes)`, note, noViewer: true,
  };
});

// IMAP itself, 1.5 million km sunward of Earth at L1. That is 0.01 au, too
// close to Earth to see at this scale, so it is drawn a little apart.
const earth = planets.find((p) => p.id === "earth")!;
planets.push({
  id: "imapcraft", name: "IMAP (at L1)", category: "solar", ra: 0, dec: 0, ly: 0,
  at: earth.at!.map((c) => c * 0.88) as [number, number, number],
  kind: "NASA spacecraft, launched 2025", distText: "0.99 au from the Sun (drawn apart from Earth)",
  note: "The Interstellar Mapping and Acceleration Probe sits at the Sun-Earth L1 point, always between us and " +
    "the Sun. From there it maps the edge of the heliosphere with neutral atoms and watches the solar wind " +
    "before it reaches Earth.",
  noViewer: true,
});

export const OBJECTS: MapObject[] = [...targets, ...landmarks, ...imap, ...planets];

/** Squash distance so 4 and 2,000 light-years both fit on one screen. */
export const scaleLy = (ly: number) => 6 * Math.log10(1 + ly);

/** Equatorial direction to x/y/z with north up (+y) and RA 0h along +x. */
export function position(o: { ra: number; dec: number; ly: number; at?: [number, number, number] }): [number, number, number] {
  if (o.at) return o.at;
  const r = scaleLy(o.ly);
  const a = (o.ra * Math.PI) / 180;
  const d = (o.dec * Math.PI) / 180;
  return [r * Math.cos(d) * Math.cos(a), r * Math.sin(d), -r * Math.cos(d) * Math.sin(a)];
}
