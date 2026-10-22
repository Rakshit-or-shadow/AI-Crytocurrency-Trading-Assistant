// Prints WCAG contrast ratios for the colour pairs in DESIGN.md.
const c = { ground: "#0C1013", surface: "#131A1E", raised: "#1B242A", ink: "#EDF2F1", muted: "#A4B1B5",
  signal: "#55C2E8", signalInk: "#06222D", amber: "#F0B44C", up: "#5CC49A", down: "#EB7A72", border: "#2A353C", bi: "#6A7A82" };
const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(c[a]), lum(c[b])].sort((p, q) => q - p); return ((x + 0.05) / (y + 0.05)).toFixed(1); };
const pairs = [["ink","ground"],["ink","surface"],["ink","raised"],["muted","ground"],["muted","surface"],["muted","raised"],
  ["signal","ground"],["signal","surface"],["signalInk","signal"],["amber","ground"],["amber","surface"],["up","surface"],["up","raised"],["down","surface"],["down","raised"],["bi","surface"]];
for (const [a, b] of pairs) console.log(`${a} on ${b}: ${ratio(a, b)}`);
