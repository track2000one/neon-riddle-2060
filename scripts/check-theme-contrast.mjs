const pairs = [
  ['academic primary', '#D2C1B6', '#1B3C53'],
  ['academic secondary', '#456882', '#FFFFFF'],
  ['deep-blue primary', '#BDE8F5', '#0F2854'],
  ['deep-blue secondary', '#1C4D8D', '#FFFFFF'],
  ['soft-beige primary', '#9CAFAA', '#172522'],
  ['soft-beige secondary', '#D6A99D', '#38231D'],
  ['pastel-study primary', '#FFA4A4', '#3A2020'],
  ['pastel-study secondary', '#BADFDB', '#183D40'],
  ['mint-calm primary', '#DC9B9B', '#3A2020'],
  ['mint-calm secondary', '#C0E1D2', '#193A31'],
  ['summer-fresh primary', '#F48F68', '#3C1D13'],
  ['summer-fresh secondary', '#8BDFDD', '#173B3A']
];

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const clean = hex.replace('#', '');
  const red = channel(Number.parseInt(clean.slice(0, 2), 16));
  const green = channel(Number.parseInt(clean.slice(2, 4), 16));
  const blue = channel(Number.parseInt(clean.slice(4, 6), 16));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(background, foreground) {
  const values = [luminance(background), luminance(foreground)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

const minimum = 4.5;
let failed = false;
for (const [name, background, foreground] of pairs) {
  const result = contrast(background, foreground);
  console.log(`${name}: ${result.toFixed(2)}:1`);
  if (result < minimum) {
    console.error(`Contrast failure: ${name} is below ${minimum}:1`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`Theme contrast check passed for ${pairs.length} button combinations.`);
