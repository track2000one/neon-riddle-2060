const pairs = [
  ['academic primary button', '#D2C1B6', '#1B3C53'],
  ['academic secondary button', '#456882', '#FFFFFF'],
  ['academic body text', '#1B3C53', '#F8FAFC'],
  ['academic card text', '#18364B', '#F8FAFC'],
  ['academic muted text', '#1B3C53', '#D6E0E6'],

  ['deep-blue primary button', '#BDE8F5', '#0F2854'],
  ['deep-blue secondary button', '#1C4D8D', '#FFFFFF'],
  ['deep-blue body text', '#0F2854', '#FFFFFF'],
  ['deep-blue card text', '#0D244C', '#FFFFFF'],
  ['deep-blue muted text', '#0F2854', '#D8EAF2'],

  ['soft-beige primary button', '#9CAFAA', '#172522'],
  ['soft-beige secondary button', '#D6A99D', '#38231D'],
  ['soft-beige body text', '#EBE3D5', '#263633'],
  ['soft-beige card text', '#FCF9F3', '#263633'],
  ['soft-beige muted text', '#FCF9F3', '#586B66'],

  ['pastel-study primary button', '#FFA4A4', '#3A2020'],
  ['pastel-study secondary button', '#BADFDB', '#183D40'],
  ['pastel-study body text', '#FCF9EA', '#243B3D'],
  ['pastel-study card text', '#FFFDF6', '#243B3D'],
  ['pastel-study muted text', '#FFFDF6', '#5A6F70'],

  ['mint-calm primary button', '#DC9B9B', '#3A2020'],
  ['mint-calm secondary button', '#C0E1D2', '#193A31'],
  ['mint-calm body text', '#F6F4E8', '#273935'],
  ['mint-calm card text', '#FFFEF8', '#273935'],
  ['mint-calm muted text', '#FFFEF8', '#60716D'],

  ['summer-fresh primary button', '#F48F68', '#3C1D13'],
  ['summer-fresh secondary button', '#8BDFDD', '#173B3A'],
  ['summer-fresh body text', '#FFF6DE', '#263839'],
  ['summer-fresh card text', '#FFFBF1', '#263839'],
  ['summer-fresh muted text', '#FFFBF1', '#5E6A65']
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
console.log(`Theme contrast check passed for ${pairs.length} text and button combinations.`);
