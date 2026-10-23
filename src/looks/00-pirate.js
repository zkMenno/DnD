// Pirate (pirate): a sea captain’s chart, the default look. One look of ☰ → Theme; tools/looks.js explains every field.
// The base look: its colour tokens and fonts are src/theme.css itself (no data-skin), its words and dice sets are
// THEMES.pirate in src/themes.js (the claude.ai sheets use them too), so only the picker entry and font files live here.
module.exports = {
  label: 'Pirate', emoji: '🏴‍☠️',
  swatch: ['#0C141C', '#E2B04A', '#ECE2CC'],   // the theme picker's swatch: dark background, accent, light background
  base: true,
  // the web/fonts files the src/theme.css fonts need (<name>-latin.woff2 and -latin-ext.woff2)
  fontFiles: ['pirata-one-400', 'alegreya-sc-500', 'alegreya-sc-700', 'alegreya-sans-400', 'alegreya-sans-500', 'alegreya-sans-700', 'ibm-plex-mono-500', 'ibm-plex-mono-700'],
};
