const demoMarks = [
  { name: "Northwind", color: "#176d84", mark: '<path d="M3 28 16 3l13 25-13-6z"/><path fill="#b6ebe3" d="m16 3 3 18-3 1-13 6z"/>' },
  { name: "Lumen", color: "#6252a2", mark: '<path d="M16 1c2.5 9 6 12.5 15 15-9 2.5-12.5 6-15 15C13.5 22 10 18.5 1 16 10 13.5 13.5 10 16 1Z"/>' },
  { name: "Brightside", color: "#b45722", mark: '<path d="M2 24a14 14 0 0 1 28 0H2Z"/><path fill="none" stroke="#b45722" stroke-width="3" d="M2 29h28"/>' },
  { name: "Kestrel", color: "#233e75", mark: '<path d="m1 5 15 8L31 5 22 19l-6 9-6-9z"/><path fill="#94b8da" d="m1 5 15 8v15l-6-9z"/>' },
  { name: "Oakleaf", color: "#28704a", mark: '<path d="M28 3C12 2 4 9 4 18a10 10 0 0 0 10 10c9 0 16-9 14-25Z"/><path fill="none" stroke="#def2dc" stroke-width="2" d="M8 24 23 9"/>' },
  { name: "Fathom", color: "#245c8b", mark: '<path fill="none" stroke="#245c8b" stroke-width="4" stroke-linecap="round" d="M3 9c5-9 9 9 14 0s9 9 12 0M3 16c5-9 9 9 14 0s9 9 12 0M3 23c5-9 9 9 14 0s9 9 12 0"/>' },
];

const svgImage = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const coPlaceDemoLogos = demoMarks.map(({ name, color, mark }) => ({
  name,
  url: svgImage(`<svg xmlns='http://www.w3.org/2000/svg' width='168' height='40' viewBox='0 0 168 40'><g transform='translate(2 4)' fill='${color}'>${mark}</g><text x='43' y='27' font-family='Arial,sans-serif' font-weight='700' font-size='22' fill='#0b1f3a'>${name}</text></svg>`),
}));

// Match only the previous demo images so saved customer uploads keep their original artwork.
const legacyDemoLogos = new Map(coPlaceDemoLogos.map((logo) => [
  svgImage(`<svg xmlns='http://www.w3.org/2000/svg' width='170' height='40'><text x='0' y='28' font-family='Arial' font-weight='800' font-size='24' fill='#0b1f3a'>${logo.name}</text></svg>`),
  logo,
]));

export const findCoPlaceDemoLogo = (url: string) => legacyDemoLogos.get(url);
