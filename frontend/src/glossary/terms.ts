// Plain-language definitions for words the site uses. One or two friendly
// sentences each, no jargon inside a definition. To add a word, add an entry
// here and put <Info term="key" /> next to where it appears.

export interface Term {
  word: string;
  text: string;
}

export const TERMS = {
  ra: {
    word: "Right Ascension (RA)",
    text: "The sky's version of longitude: how far east a spot is, measured around the sky. It is often written in hours, minutes and seconds (24 hours make a full circle) or in degrees (0 to 360).",
  },
  dec: {
    word: "Declination (Dec)",
    text: "The sky's version of latitude: how far north or south of the sky's equator a spot is, from +90° (above the North Pole) to −90° (above the South Pole).",
  },
  coordinates: {
    word: "Sky coordinates",
    text: "Two numbers, RA and Dec, that pin down one exact spot on the sky, like a street address for stars. Everyone on Earth uses the same ones.",
  },
  fov: {
    word: "Field of view",
    text: "How big a patch of sky the picture shows. A smaller field zooms in on detail; a bigger one shows more of the surroundings.",
  },
  arcmin: {
    word: "Arcminute (′)",
    text: "A tiny angle used to measure sizes and distances on the sky: 1/60 of a degree. The full Moon is about 30 arcminutes wide.",
  },
  arcsec: {
    word: "Arcsecond (″)",
    text: "An even tinier angle: 1/60 of an arcminute. It is about the width of a coin seen from 4 kilometres away. Nearby stars drift a few arcseconds a year.",
  },
  band: {
    word: "Band (detector)",
    text: "SPHEREx has six cameras, each catching a different range of infrared colours. Band 1 sees the shortest wavelengths and band 6 the longest.",
  },
  wavelength: {
    word: "Wavelength",
    text: "Light travels as waves, and the distance between wave peaks sets its colour. Our eyes see wavelengths from about 0.4 to 0.7 microns; SPHEREx sees longer ones that are invisible to us.",
  },
  micron: {
    word: "Micron (µm)",
    text: "A millionth of a metre. It is the unit used for infrared wavelengths; SPHEREx sees from 0.75 to 5 microns.",
  },
  channel: {
    word: "Channel",
    text: "SPHEREx splits its light into 102 narrow slices of colour. A channel is one of those slices, like one key on a piano.",
  },
  infrared: {
    word: "Infrared",
    text: "Light with longer waves than red, which our eyes cannot see but we feel as warmth. Cool objects such as brown dwarfs glow mostly in infrared, so an infrared telescope can spot them.",
  },
  spherex: {
    word: "SPHEREx",
    text: "A NASA space telescope launched in 2025 that photographs the whole sky in 102 infrared colours, covering it again every six months. These repeat visits are what let us see things change and move.",
  },
  exposure: {
    word: "Exposure (frame)",
    text: "One picture taken by the telescope at one moment. Flipping through exposures taken on different dates is how you see change over time.",
  },
  blink: {
    word: "Blinking",
    text: "Flipping quickly between pictures of the same patch of sky. Stars stay put, so anything that jumps around or flickers stands out. Astronomers found Pluto this way in 1930.",
  },
  coadd: {
    word: "Co-add (deep image)",
    text: "Many pictures of the same spot stacked into one. Stacking cancels out random noise, so faint things that are hard to see in a single picture show up.",
  },
  difference: {
    word: "Difference image (subtract)",
    text: "One picture minus another. Things that stay the same cancel to grey, so only what moved or changed brightness is left, shown as a light and dark pair.",
  },
  add: {
    word: "Adding images",
    text: "Averaging a few pictures in a row to make a smoother, less noisy picture, while still keeping the change over time.",
  },
  saturation: {
    word: "Saturated",
    text: "When a star is so bright that the camera's pixels fill up, like an overexposed photo. Its true brightness can't be measured and it looks like a flat blob.",
  },
  flags: {
    word: "Quality flags (checks)",
    text: "Labels the SPHEREx team puts on pixels that can't be trusted, for example from a cosmic ray hit, a glare reflection or a faulty pixel. The site leaves those pixels out.",
  },
  spectrum: {
    word: "Spectrum",
    text: "How bright something is at each colour (wavelength). It works like a fingerprint: it can tell you how hot an object is and what it is made of.",
  },
  catalogue: {
    word: "Catalogue overlay",
    text: "Markers drawn on the picture from a list of already-known stars and galaxies, so you can tell which dots are known and which might be new.",
  },
  gaia: {
    word: "Gaia",
    text: "A European space telescope that measured the positions, distances and motions of nearly 2 billion stars. Its third data release is called DR3.",
  },
  wise: {
    word: "WISE / CatWISE",
    text: "WISE was a NASA infrared telescope that mapped the whole sky from 2009 to 2024. CatWISE2020 is a list of objects from those maps, including how they move.",
  },
  movers: {
    word: "Known fast movers",
    text: "Nearby stars and brown dwarfs that are already known to drift quickly across the sky. Their markers show where they should be on each picture's date.",
  },
  properMotion: {
    word: "Proper motion",
    text: "How fast a star slowly slides across the sky as seen from Earth, usually in arcseconds per year. Close stars move the most, which is how hidden nearby objects are found.",
  },
  magnitude: {
    word: "Magnitude (brightness)",
    text: "Astronomers' brightness scale, where smaller numbers mean brighter. A star of magnitude 1 is 100 times brighter than one of magnitude 6.",
  },
  lightYear: {
    word: "Light-year",
    text: "The distance light travels in a year, about 9.5 trillion kilometres. It measures distance, not time.",
  },
  brownDwarf: {
    word: "Brown dwarf",
    text: "An object bigger than a planet but too small to shine like a star; sometimes called a failed star. It slowly cools, glowing faintly in infrared.",
  },
  redDwarf: {
    word: "Red dwarf",
    text: "The smallest, coolest and most common kind of true star. Most are too faint to see without a telescope, even nearby ones.",
  },
  variable: {
    word: "Variable star",
    text: "A star whose brightness changes over time, because it pulses, has dust passing in front of it, or is being eclipsed by a partner star.",
  },
  mira: {
    word: "Mira variable",
    text: "An old, swollen red giant star that slowly swells and shrinks, getting brighter and fainter on a cycle of months.",
  },
  simbad: {
    word: "SIMBAD",
    text: "A free online database run in Strasbourg, France, that lists millions of known objects beyond the Solar System with their names, types and distances.",
  },
  planetX: {
    word: "Planet X",
    text: "A possible undiscovered planet far beyond Neptune. If it exists it would be cold and dim, so it would show up best as a slowly moving infrared dot.",
  },
} satisfies Record<string, Term>;

export type TermKey = keyof typeof TERMS;
