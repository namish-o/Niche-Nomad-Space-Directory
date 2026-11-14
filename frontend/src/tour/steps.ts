export interface Step {
  /** CSS selector of the thing to point at. Steps whose target is missing are skipped. */
  target: string;
  title: string;
  body: string;
}

export const HOME_STEPS: Step[] = [
  {
    target: ".home-search",
    title: "Start with a spot on the sky",
    body: "Type a sky position here, as two numbers: RA then Dec, in degrees (like 133.7951 -7.2451). Don't know one? Try the example under the box.",
  },
  {
    target: ".home-search button.primary",
    title: "Press Go",
    body: "We fetch every SPHEREx picture of that spot. The tour picks up again in the viewer.",
  },
];

export const VIEWER_STEPS: Step[] = [
  {
    target: ".stage",
    title: "The picture",
    body: "This is your patch of sky. Drag to move around, scroll or pinch to zoom, double-click to re-centre on a spot.",
  },
  {
    target: ".player",
    title: "Blink through time",
    body: "Play flips through the pictures in date order. Stars stay put. Anything that jumps between frames is worth a closer look. Drag the slider to step by hand.",
  },
  {
    target: ".controls .search",
    title: "Go somewhere else",
    body: "Type new coordinates here, or pick one of the test targets next to it, like Barnard's Star.",
  },
  {
    target: ".controls > label:nth-of-type(2)",
    title: "Pick a colour of light",
    body: "SPHEREx sees 102 infrared colours, called bands. Cold, faint objects often show up best in the longer ones.",
  },
  {
    target: ".fov-picker",
    title: "How much sky",
    body: "Field of view sets how wide the picture is. Smaller is sharper and loads faster.",
  },
  {
    target: ".image-ops",
    title: "Spot the change",
    body: "Difference mode subtracts one picture from another. Stars cancel out, so whatever moved is left as a light and dark pair.",
  },
  {
    target: ".overlay-panel",
    title: "Known stars on top",
    body: "Overlays mark stars from the Gaia and WISE catalogues. Click a mark to see what it is and how fast it moves.",
  },
  {
    target: ".spectrum",
    title: "Measure its light",
    body: "Measures how bright the centre spot is in each band. The shape of that curve hints at how hot the object is.",
  },
  {
    target: ".saved",
    title: "Keep this view",
    body: "Save a view to come back to it later. Sign in to keep saves across devices.",
  },
  {
    target: "#glossary",
    title: "Stuck on a word?",
    body: "Every small ? button explains a term in plain English. The full list lives here.",
  },
  {
    target: ".tour-retake",
    title: "That's it",
    body: "You can run this tour again any time from this button.",
  },
];
