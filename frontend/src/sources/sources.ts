// Every outside source of data, facts or code the site uses. Keep this in
// step with the code: add a line when you add a new archive, catalogue or library.

export interface Source {
  name: string;
  url: string;
  what: string;
}

export const SOURCE_GROUPS: { title: string; items: Source[] }[] = [
  {
    title: "Sky pictures",
    items: [
      { name: "SPHEREx (NASA/JPL-Caltech)", url: "https://irsa.ipac.caltech.edu/Missions/spherex.html", what: "Every picture, spectrum and light curve. Downloaded live from the NASA/IPAC Infrared Science Archive (IRSA)." },
      { name: "SPHEREx all-sky map (IRSA HiPS)", url: "https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube", what: "The zoomable whole-sky SPHEREx map in the sky atlas." },
      { name: "IRSA SPHEREx tutorials", url: "https://caltech-ipac.github.io/irsa-tutorials/spherex/", what: "How we learned to search, cut out and read SPHEREx images." },
    ],
  },
  {
    title: "Star catalogues and facts",
    items: [
      { name: "Gaia DR3 (ESA)", url: "https://www.cosmos.esa.int/web/gaia/dr3", what: "Star positions and motions for the Gaia overlay, read through IRSA." },
      { name: "CatWISE2020 (NASA WISE)", url: "https://irsa.ipac.caltech.edu/Missions/wise.html", what: "Infrared sources and their motions for the WISE overlay, read through IRSA." },
      { name: "SPLICES", url: "https://irsa.ipac.caltech.edu/", what: "SPHEREx ice-source list for the ices overlay, read through IRSA." },
      { name: "SIMBAD (CDS, Strasbourg)", url: "https://simbad.cds.unistra.fr/simbad/", what: "Object names, types and positions for search and the \"what is here\" card." },
      { name: "Luhman & Esplin 2016, AJ 152, 78", url: "https://ui.adsabs.harvard.edu/abs/2016AJ....152...78L", what: "The motion we use to find where WISE 0855 is today." },
      { name: "ESA/Hubble", url: "https://esahubble.org/", what: "\"Learn more\" links in the glossary. Text credited to ESA/Hubble (CC BY 4.0)." },
    ],
  },
  {
    title: "Tools and code",
    items: [
      { name: "Aladin Lite (CDS)", url: "https://aladin.cds.unistra.fr/AladinLite/", what: "The sky atlas panel." },
      { name: "Qwen3 0.6B (onnx-community)", url: "https://huggingface.co/onnx-community/Qwen3-0.6B-ONNX", what: "The small model behind Niche, run in your browser." },
      { name: "Transformers.js (Hugging Face)", url: "https://huggingface.co/docs/transformers.js", what: "Runs the Niche model in the browser." },
      { name: "three.js", url: "https://threejs.org/", what: "The 3D map of the targets." },
      { name: "React and Vite", url: "https://react.dev/", what: "The website itself." },
      { name: "Supabase", url: "https://supabase.com/", what: "Sign-in and saved views." },
      { name: "Sentry", url: "https://sentry.io/", what: "Crash reports, so we can fix bugs." },
      { name: "VT323 font (Google Fonts)", url: "https://fonts.google.com/specimen/VT323", what: "The pixel font. SIL Open Font License." },
    ],
  },
];
