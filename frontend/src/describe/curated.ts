// Hand-written descriptions for the five challenge targets. They win over the
// automatic SIMBAD text whenever the view is centred close to one of them.
import { TARGETS } from "../data/targets";
import type { TermKey } from "../glossary/terms";
import { angularSeparationDeg } from "./simbad";

export interface Curated {
  id: string;
  name: string;
  kind: string;
  term: TermKey; // glossary entry for the kind of object
  distance: string;
  text: string;
  lookFor: string;
}

const CURATED: Record<string, Omit<Curated, "id" | "name">> = {
  wise0855: {
    term: "brownDwarf",
    kind: "Brown dwarf (Y dwarf)",
    distance: "7.4 light-years",
    text:
      "The coldest known object outside our Solar System that is not a planet, about as cool as the North Pole " +
      "(around −20 °C). It was found in 2014 by NASA's WISE telescope and is the fourth-closest system to the Sun. " +
      "It is too faint to see in visible light and glows only in the infrared, which is exactly what SPHEREx sees.",
    lookFor:
      "It moves about 8 arcseconds a year, so it has drifted roughly 1.6 arcminutes west (right) of the 2014 " +
      "marker. Blink the frames or use 'difference' mode and look for a faint dot that is brighter at long wavelengths.",
  },
  barnard: {
    term: "redDwarf",
    kind: "Red dwarf star",
    distance: "6 light-years",
    text:
      "The fastest-moving star across our sky and the closest single star to the Sun. It is a small, old red dwarf, " +
      "too faint to see with the naked eye. In 2024 astronomers confirmed it has small rocky planets orbiting it.",
    lookFor:
      "It shifts about 10 arcseconds a year, the width of a few SPHEREx pixels over the mission. It is very bright " +
      "in the infrared, so it saturates and appears as a large blob.",
  },
  epsindb: {
    term: "brownDwarf",
    kind: "Pair of brown dwarfs orbiting a star",
    distance: "12 light-years",
    text:
      "Two brown dwarfs (Ba and Bb) that orbit each other, and together circle the Sun-like star Epsilon Indi A " +
      "from far away. Brown dwarfs are 'failed stars': too small to burn hydrogen, so they slowly cool and glow in infrared.",
    lookFor:
      "The pair moves about 4.7 arcseconds a year. At SPHEREx resolution the two brown dwarfs blend into one dot; " +
      "the bright star Epsilon Indi A is about 7 arcminutes away.",
  },
  rwaur: {
    term: "variable",
    kind: "Young variable star (T Tauri type)",
    distance: "about 500 light-years",
    text:
      "A very young star, only a few million years old, still surrounded by the disc of gas and dust it formed from. " +
      "Clumps of dust passing in front of it make it dim suddenly and unpredictably.",
    lookFor:
      "It does not move, but its brightness changes from frame to frame. Compare its brightness with nearby stars as you blink.",
  },
  rdra: {
    term: "mira",
    kind: "Mira variable (pulsating red giant)",
    distance: "about 2,000 light-years",
    text:
      "An old red giant star that swells and shrinks, changing brightness on a regular cycle of about 246 days. " +
      "Our Sun will become a star like this in billions of years.",
    lookFor:
      "Its position is fixed but it brightens and fades over months, so compare early and late frames rather than neighbouring ones.",
  },
};

/** The curated entry for a challenge target near (ra, dec), within `radiusDeg`. */
export function curatedNear(ra: number, dec: number, radiusDeg = 5 / 60): Curated | null {
  for (const t of TARGETS) {
    const c = CURATED[t.id];
    if (c && angularSeparationDeg(ra, dec, t.ra, t.dec) <= radiusDeg) return { id: t.id, name: t.name, ...c };
  }
  return null;
}
