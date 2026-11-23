import { PDFDocument, rgb, degrees } from './_vendor/pdf-lib.esm.min.js';
import fontkit from './_vendor/fontkit.esm.min.js';
import { IS_REGULAR, IS_SEMIBOLD } from './_vendor/instrument-sans.js';
import { agreementHtml, HANDBOOK_HTML } from './_onboard-docs.js';

// The MyQuest wordmark from public/assets/myquest-logo.svg, as [x, y, path] in its 1340 × 380 box.
const LOGO = [[-19.006,288.0,"M 268.8 0 L 268.8 -217.6 L 268 -217.6 L 192 0 L 148.8 0 L 72.8 -217.6 L 72 -217.6 L 72 0 L 29.2 0 L 29.2 -276 L 93.2 -276 L 170 -55.6 L 170.8 -55.6 L 248 -276 L 311.6 -276 L 311.6 0Z M 268.8 0 "],[301.792,288.0,"M 83.6 85.6 L 42.8 85.6 L 70 2.4 L -0.4 -190.4 L 46 -190.4 L 90 -62 L 90.8 -62 L 132 -190.4 L 178.4 -190.4Z M 83.6 85.6 "],[459.39,288.0,"M 189.2 -138 C 189.2 -148.1 188.6 -159.5 187.4 -172.2 C 186.2 -184.9 183.6 -196.7 179.6 -207.8 C 175.6 -218.9 169.6 -228.2 161.6 -235.8 C 153.6 -243.4 142.8 -247.2 129.2 -247.2 C 115.6 -247.2 104.8 -243.4 96.8 -235.8 C 88.8 -228.2 82.7 -218.9 78.6 -207.8 C 74.5 -196.7 71.9 -184.9 70.8 -172.2 C 69.7 -159.5 69.2 -148.1 69.2 -138 C 69.2 -127.9 69.8 -116.7 71 -104.6 C 72.2 -92.5 74.8 -81.1 78.8 -70.4 C 82.8 -59.7 88.8 -50.9 96.8 -43.8 C 104.8 -36.7 115.6 -33.2 129.2 -33.2 C 142.8 -33.2 153.5 -36.7 161.4 -43.8 C 169.3 -50.9 175.3 -59.7 179.4 -70.4 C 183.5 -81.1 186.2 -92.5 187.4 -104.6 C 188.6 -116.7 189.2 -127.9 189.2 -138Z M 129.2 0 C 107.6 0 89.6 -3.6 75.2 -10.8 C 60.8 -18 49.3 -27.8 40.8 -40.2 C 32.3 -52.6 26.3 -67.2 22.8 -84 C 19.3 -100.8 17.6 -118.8 17.6 -138 C 17.6 -157.2 19.3 -175.4 22.6 -192.6 C 25.9 -209.8 31.8 -224.9 40.2 -238 C 48.6 -251.1 60 -261.4 74.4 -269 C 88.8 -276.6 107.1 -280.4 129.2 -280.4 C 151.1 -280.4 169.2 -276.6 183.6 -269 C 198 -261.4 209.5 -251.1 218 -238 C 226.5 -224.9 232.5 -209.8 235.8 -192.6 C 239.1 -175.4 240.8 -157.2 240.8 -138 C 240.8 -129.2 240.4 -120.1 239.6 -110.8 C 238.8 -101.5 237.4 -92.2 235.4 -83 C 233.4 -73.8 230.5 -64.9 226.8 -56.4 C 223.1 -47.9 218.3 -40.1 212.4 -33.2 L 262.4 -36 L 262.4 0Z M 129.2 0 "],[706.188,288.0,"M 136 0 L 136 -35.6 L 135.2 -35.6 C 130.4 -23.3 123.2 -13.6 113.6 -6.4 C 104 0.8 92.4 4.4 78.8 4.4 C 69.7 4.4 61.9 2.7 55.4 -0.8 C 48.9 -4.3 43.5 -8.9 39.4 -14.6 C 35.3 -20.3 32.2 -27 30.2 -34.6 C 28.2 -42.2 27.2 -50.1 27.2 -58.4 L 27.2 -190.4 L 71.6 -190.4 L 71.6 -81.6 C 71.6 -79.5 71.6 -76.5 71.6 -72.6 C 71.6 -68.7 71.7 -64.7 72 -60.6 C 72.3 -56.5 72.9 -52.5 73.8 -48.8 C 74.7 -45.1 76.3 -42.4 78.4 -40.8 C 80 -39.2 82 -38.2 84.4 -37.8 C 86.8 -37.4 89.1 -37.2 91.2 -37.2 C 99.2 -37.2 106 -39.7 111.6 -44.6 C 117.2 -49.5 121.8 -55.7 125.4 -63 C 129 -70.3 131.7 -78.1 133.4 -86.2 C 135.1 -94.3 136 -101.6 136 -108 L 136 -190.4 L 180.4 -190.4 L 180.4 0Z M 136 0 "],[893.787,288.0,"M 128 -133.6 C 128 -143.7 124.9 -151.7 118.8 -157.6 C 112.7 -163.5 104.5 -166.4 94.4 -166.4 C 84.8 -166.4 76.7 -163.3 70 -157.2 C 63.3 -151.1 59.5 -143.2 58.4 -133.6Z M 57.2 -106.8 C 57.2 -96.7 58.9 -86.8 62.2 -77.2 C 65.5 -67.6 70.3 -59.1 76.6 -51.6 C 82.9 -44.1 90.4 -38.1 99.2 -33.6 C 108 -29.1 117.9 -26.8 128.8 -26.8 C 134.9 -26.8 141.1 -27.5 147.4 -29 C 153.7 -30.5 159.6 -32.1 165.2 -34 L 165.2 -3.2 C 148.4 1.9 130.7 4.4 112 4.4 C 94.9 4.4 80.3 1.7 68.2 -3.8 C 56.1 -9.3 46.1 -16.9 38.4 -26.8 C 30.7 -36.7 25 -48.3 21.4 -61.6 C 17.8 -74.9 16 -89.5 16 -105.2 C 16 -118.5 17.6 -130.7 20.8 -141.8 C 24 -152.9 28.9 -162.3 35.6 -170.2 C 42.3 -178.1 50.7 -184.1 61 -188.4 C 71.3 -192.7 83.5 -194.8 97.6 -194.8 C 121.9 -194.8 140 -187.7 152 -173.6 C 164 -159.5 170 -140.8 170 -117.6 L 170 -106.8Z M 57.2 -106.8 "],[1058.985,288.0,"M 137.6 -52.8 C 137.6 -42.1 135.6 -33.2 131.6 -26 C 127.6 -18.8 122.3 -12.9 115.6 -8.4 C 108.9 -3.9 101.3 -0.6 92.6 1.4 C 83.9 3.4 74.9 4.4 65.6 4.4 C 48 4.4 31.2 1.9 15.2 -3.2 L 15.2 -41.6 C 22.9 -38.1 30.8 -35.3 38.8 -33.2 C 46.8 -31.1 55.1 -30 63.6 -30 C 66.5 -30 69.9 -30.2 73.6 -30.6 C 77.3 -31 80.9 -31.8 84.4 -33 C 87.9 -34.2 90.7 -35.9 93 -38.2 C 95.3 -40.5 96.4 -43.5 96.4 -47.2 C 96.4 -50.9 94.4 -54.6 90.4 -58.2 C 86.4 -61.8 81.3 -65.6 75.2 -69.6 C 69.1 -73.6 62.5 -77.9 55.4 -82.4 C 48.3 -86.9 41.7 -92 35.6 -97.6 C 29.5 -103.2 24.4 -109.3 20.4 -116 C 16.4 -122.7 14.4 -130.3 14.4 -138.8 C 14.4 -148.7 16.3 -157.1 20 -164.2 C 23.7 -171.3 28.8 -177.1 35.2 -181.6 C 41.6 -186.1 48.9 -189.5 57.2 -191.6 C 65.5 -193.7 74 -194.8 82.8 -194.8 C 90.3 -194.8 97.5 -194.1 104.6 -192.8 C 111.7 -191.5 118.8 -189.7 126 -187.6 L 126 -150 C 119.3 -153.5 112.5 -156.5 105.6 -159 C 98.7 -161.5 91.3 -162.8 83.6 -162.8 C 81.2 -162.8 78.3 -162.5 74.8 -161.8 C 71.3 -161.1 68.1 -160.1 65 -158.8 C 61.9 -157.5 59.3 -155.7 57.2 -153.4 C 55.1 -151.1 54 -148.4 54 -145.2 C 54 -140.9 56.1 -136.9 60.2 -133.2 C 64.3 -129.5 69.5 -125.7 75.6 -122 C 81.7 -118.3 88.5 -114.3 95.8 -110 C 103.1 -105.7 109.9 -100.9 116 -95.4 C 122.1 -89.9 127.3 -83.7 131.4 -76.8 C 135.5 -69.9 137.6 -61.9 137.6 -52.8Z M 137.6 -52.8 "],[1186.984,288.0,"M 89.6 -159.6 L 89.6 -69.6 C 89.6 -64 89.9 -58.6 90.4 -53.4 C 90.9 -48.2 92.2 -43.6 94.2 -39.6 C 96.2 -35.6 99.2 -32.5 103.2 -30.2 C 107.2 -27.9 112.7 -26.8 119.6 -26.8 C 123.1 -26.8 126.5 -27.1 129.8 -27.8 C 133.1 -28.5 136.5 -29.2 140 -30 L 140 1.2 C 133.9 2.3 127.8 3.1 121.8 3.6 C 115.8 4.1 109.7 4.4 103.6 4.4 C 84.1 4.4 69.5 0.6 59.8 -7 C 50.1 -14.6 45.2 -28.3 45.2 -48 L 45.2 -159.6 L 8 -159.6 L 8 -190.4 L 45.2 -190.4 L 45.2 -235.6 L 89.6 -262.4 L 89.6 -190.4 L 146 -190.4 L 146 -159.6Z M 89.6 -159.6 "]];

const INK = rgb(0.067, 0.067, 0.067);
const GREY = rgb(0.333, 0.333, 0.333);
const SOFT = rgb(0.467, 0.467, 0.467);
const HAIR = rgb(0.933, 0.933, 0.925);
const PANEL = rgb(0.957, 0.957, 0.949);
const HL = rgb(0.898, 0.957, 0.894);
const HLT = rgb(0.078, 0.247, 0.114);
const WHITE = rgb(1, 1, 1);
const MOTTO = rgb(0.91, 0.91, 0.91);
const COVER_SOFT = rgb(0.6, 0.6, 0.6);

const W = 595.28, H = 841.89, M = 50, CW = W - M * 2;
const FOOT_Y = 30, BOTTOM = 62;

const b64bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const ent = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
const plain = (s) => ent(String(s || '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

const fmtWhen = (d) => d.toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' (Brisbane time)';
const fmtDay = (d) => d.toLocaleDateString('en-AU', { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'long', year: 'numeric' });

const rrPath = (w, h, r) => {
  r = Math.min(r, w / 2, h / 2);
  return `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;
};
const topRoundPath = (w, h, r) => `M 0 ${h} V ${r} Q 0 0 ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h} Z`;

// Splits inline HTML into words, each made of runs that are bold or not, so mixed text wraps and measures properly.
function words(html) {
  const chars = [];
  const re = /<b>([\s\S]*?)<\/b>|<[^>]+>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[1] !== undefined) for (const c of ent(m[1].replace(/<[^>]+>/g, ''))) chars.push([c, true]);
    else if (m[2] !== undefined) for (const c of ent(m[2])) chars.push([c, false]);
  }
  const out = [];
  let cur = null;
  for (const [c, b] of chars) {
    if (/\s/.test(c)) { cur = null; continue; }
    if (!cur) { cur = []; out.push(cur); }
    const last = cur[cur.length - 1];
    if (last && last.b === b) last.s += c; else cur.push({ s: c, b });
  }
  return out;
}

async function setup(title, subject) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(title);
  pdf.setAuthor('MyQuest Pty Ltd');
  pdf.setSubject(subject);
  pdf.setCreator('myquest.au/start');
  const reg = await pdf.embedFont(b64bytes(IS_REGULAR), { subset: true });
  const semi = await pdf.embedFont(b64bytes(IS_SEMIBOLD), { subset: true });
  const known = new Set(reg.getCharacterSet());
  // Swap anything the font can't draw for its plain letter, or drop it, so no box or error ever appears.
  const safe = (s) => [...String(s || '').normalize('NFC')].map((c) => {
    if (known.has(c.codePointAt(0))) return c;
    const base = c.normalize('NFD')[0];
    return known.has(base.codePointAt(0)) ? base : '';
  }).join('');
  return { pdf, reg, semi, safe };
}

class Doc {
  constructor(t, { header, footer }) {
    Object.assign(this, t);
    this.header = header; this.footer = footer; this.pages = []; this.cover = null;
  }

  font(b) { return b ? this.semi : this.reg; }
  width(s, b, size) { return this.font(b).widthOfTextAtSize(this.safe(s), size); }
  wordWidth(w, size) { return w.reduce((a, r) => a + this.width(r.s, r.b, size), 0); }

  logo(page, x, yTop, width, color) {
    const s = width / 1340;
    for (const [tx, ty, d] of LOGO) page.drawSvgPath(d, { x: x + tx * s, y: yTop - ty * s, scale: s, color });
  }

  newPage() {
    const p = this.pdf.addPage([W, H]);
    this.pages.push(p); this.page = p;
    this.logo(p, M, H - M + 4, 92, INK);
    this.header.forEach((l, i) => {
      const size = 7.5; let s = this.safe(l);
      while (this.reg.widthOfTextAtSize(s, size) > CW - 150 && s.length > 4) s = s.slice(0, -2).trimEnd() + '...';
      p.drawText(s, { x: W - M - this.reg.widthOfTextAtSize(s, size), y: H - M - 3 - i * 10.5, size, font: this.reg, color: GREY });
    });
    p.drawLine({ start: { x: M, y: H - M - 34 }, end: { x: W - M, y: H - M - 34 }, thickness: 1.2, color: INK });
    this.y = H - M - 58;
  }
  need(h) { if (this.y - h < BOTTOM) this.newPage(); }

  // Wraps words into lines no wider than max; a single word wider than a line is broken by letters.
  wrap(ws, size, max) {
    const space = this.reg.widthOfTextAtSize(' ', size);
    const lines = []; let line = []; let lw = 0;
    const push = (w, ww) => {
      if (line.length && lw + space + ww > max) { lines.push(line); line = []; lw = 0; }
      lw += (line.length ? space : 0) + ww; line.push(w);
    };
    for (const w of ws) {
      const ww = this.wordWidth(w, size);
      if (ww <= max) { push(w, ww); continue; }
      let piece = [];
      for (const r of w) for (const c of r.s) {
        const tryW = [...piece, { s: c, b: r.b }];
        if (this.wordWidth(tryW, size) > max && piece.length) { push(piece, this.wordWidth(piece, size)); piece = []; }
        const last = piece[piece.length - 1];
        if (last && last.b === r.b) last.s += c; else piece.push({ s: c, b: r.b });
      }
      if (piece.length) push(piece, this.wordWidth(piece, size));
    }
    if (line.length) lines.push(line);
    return lines;
  }
  drawLine(page, line, x, y, size, color, boldColor) {
    const space = this.reg.widthOfTextAtSize(' ', size);
    let cx = x;
    line.forEach((w, i) => {
      if (i) cx += space;
      for (const r of w) {
        const s = this.safe(r.s);
        page.drawText(s, { x: cx, y, size, font: this.font(r.b), color: r.b && boldColor ? boldColor : color });
        cx += this.font(r.b).widthOfTextAtSize(s, size);
      }
    });
  }

  para(html, { size = 9.5, lead = 14, color = INK, x = M, width = CW, after = 6 } = {}) {
    const lines = this.wrap(words(html), size, width);
    for (const l of lines) { this.need(lead); this.drawLine(this.page, l, x, this.y - size, size, color); this.y -= lead; }
    this.y -= after;
  }

  heading(text, { size = 11.5, hl = 0, before = 10, after = 8 } = {}) {
    this.y -= before;
    this.need(size + 46);
    const ws = text.split(' ');
    const split = ws.length - hl;
    const a = this.safe(ws.slice(0, split).join(' ')); const b = this.safe(ws.slice(split).join(' '));
    const full = this.semi.widthOfTextAtSize(this.safe(text), size);
    const base = this.y - size;
    if (!hl || full + 12 > CW) {
      this.para(`<b>${text}</b>`, { size, lead: size * 1.3, after: 0 });
      this.y -= after; return;
    }
    const aw = a ? this.semi.widthOfTextAtSize(a + ' ', size) : 0;
    const bw = this.semi.widthOfTextAtSize(b, size);
    if (a) this.page.drawText(a, { x: M, y: base, size, font: this.semi, color: INK });
    const px = size * 0.3;
    this.page.drawSvgPath(rrPath(bw + px * 2, size * 1.32, size * 0.3), { x: M + aw - px * 0.4, y: base + size * 0.98, color: HL });
    this.page.drawText(b, { x: M + aw + px * 0.6, y: base, size, font: this.semi, color: HLT });
    this.y -= size * 1.35 + after;
  }

  list(items, ordered) {
    const size = 9.5, lead = 14, indent = 20;
    items.forEach((html, i) => {
      const lines = this.wrap(words(html), size, CW - indent);
      this.need(lead + 2);
      const top = this.y;
      if (ordered) {
        this.page.drawText(`${i + 1}.`, { x: M + 2, y: top - size, size, font: this.semi, color: INK });
      } else {
        const r = 6.2, cx = M + r, cy = top - size * 0.62;
        this.page.drawCircle({ x: cx, y: cy, size: r, color: HL });
        this.page.drawSvgPath('M -2.6 0 L -0.8 1.8 L 2.6 -1.8', { x: cx, y: cy, borderColor: HLT, borderWidth: 1.2 });
      }
      for (const l of lines) { this.need(lead); this.drawLine(this.page, l, M + indent, this.y - size, size, INK); this.y -= lead; }
      this.y -= 3;
    });
    this.y -= 5;
  }

  layoutTable(rows) {
    const size = 8.8, lead = 12.5, pad = 7, n = rows[0].length;
    const nat = Array.from({ length: n }, (_, c) => Math.max(...rows.map((r) => Math.min(this.width(plain(r[c] || ''), c === 0, size), 230))) + pad * 2);
    let ws = nat.map((v) => (CW * v) / nat.reduce((a, b) => a + b, 0));
    const MIN = Math.min(84, CW / n);
    for (let k = 0; k < 3; k++) {
      const low = ws.map((w) => w < MIN);
      const fixed = low.reduce((a, l) => a + (l ? MIN : 0), 0);
      const rest = ws.reduce((a, w, i) => a + (low[i] ? 0 : w), 0);
      ws = ws.map((w, i) => (low[i] ? MIN : (w * (CW - fixed)) / rest));
    }
    const laid = rows.map((r, ri) => {
      const cells = r.map((html, c) => this.wrap(words(ri === 0 || c === 0 ? `<b>${plain(html)}</b>` : html), size, ws[c] - pad * 2));
      return { cells, h: Math.max(...cells.map((l) => l.length)) * lead + pad * 2 - 3 };
    });
    return { ws, laid, size, lead, pad, total: laid.reduce((a, r) => a + r.h, 0) };
  }

  table(rows) {
    const { ws, laid, size, lead, pad, total: whole } = this.layoutTable(rows);
    const head = laid[0];
    let i = 1;
    this.y -= 2;
    if (this.y - whole < BOTTOM && whole <= H - M - 58 - BOTTOM) this.newPage();
    while (i < laid.length) {
      this.need(head.h + laid[i].h + 4);
      const top = this.y;
      const seg = [head];
      let used = head.h;
      while (i < laid.length && (seg.length === 1 || this.y - used - laid[i].h >= BOTTOM)) { seg.push(laid[i]); used += laid[i].h; i++; }
      const p = this.page;
      p.drawSvgPath(topRoundPath(CW, head.h, 10), { x: M, y: top, color: INK });
      let ry = top;
      seg.forEach((row, k) => {
        if (k > 1) p.drawLine({ start: { x: M + 1, y: ry }, end: { x: M + CW - 1, y: ry }, thickness: 0.7, color: HAIR });
        let cx = M;
        row.cells.forEach((lines, c) => {
          lines.forEach((l, li) => this.drawLine(p, l, cx + pad, ry - pad - size + 1 - li * lead, size, k === 0 ? WHITE : INK));
          cx += ws[c];
        });
        ry -= row.h;
      });
      p.drawSvgPath(rrPath(CW, used, 10), { x: M, y: top, borderColor: INK, borderWidth: 1.3 });
      this.y = top - used - 10;
    }
  }

  kv(rows) {
    const size = 9, lead = 13, kw = 118, padX = 14, padY = 6;
    const laid = rows.map(([k, v]) => ({ k: this.safe(k), lines: this.wrap(words(v), size, CW - padX * 2 - kw) }));
    const hs = laid.map((r) => r.lines.length * lead + 9);
    const total = hs.reduce((a, b) => a + b, 0) + padY * 2;
    this.need(total + 4);
    const top = this.y; const p = this.page;
    let ry = top - padY;
    laid.forEach((r, i) => {
      p.drawText(r.k, { x: M + padX, y: ry - size - 4, size, font: this.reg, color: GREY });
      r.lines.forEach((l, li) => this.drawLine(p, l, M + padX + kw, ry - size - 4 - li * lead, size, INK));
      ry -= hs[i];
      if (i < laid.length - 1) p.drawLine({ start: { x: M + padX, y: ry }, end: { x: W - M - padX, y: ry }, thickness: 0.7, color: HAIR });
    });
    p.drawSvgPath(rrPath(CW, total, 14), { x: M, y: top, borderColor: INK, borderWidth: 1.3 });
    this.y = top - total - 14;
  }

  chip(text, x, y) {
    const size = 8, s = this.safe(text);
    const w = this.semi.widthOfTextAtSize(s, size) + 30;
    this.page.drawSvgPath(rrPath(w, 17, 8.5), { x, y, color: HL });
    this.page.drawSvgPath('M -2.6 0 L -0.8 1.8 L 2.6 -1.8', { x: x + 12, y: y - 8.5, borderColor: HLT, borderWidth: 1.2 });
    this.page.drawText(s, { x: x + 20, y: y - 11.6, size, font: this.semi, color: HLT });
    return w;
  }

  panel(html, { size = 8, lead = 11.5, color = GREY, fill = PANEL } = {}) {
    const lines = this.wrap(words(html), size, CW - 28);
    const h = lines.length * lead + 20;
    this.need(h + 4);
    this.page.drawSvgPath(rrPath(CW, h, 12), { x: M, y: this.y, color: fill });
    lines.forEach((l, i) => this.drawLine(this.page, l, M + 14, this.y - 10 - size - i * lead, size, color));
    this.y -= h + 10;
  }

  // Lays out the onboarding HTML: headings, paragraphs, lists and tables, in the order they appear.
  html(src, { hlHeadings = false, headingSize = 11.5 } = {}) {
    const re = /<(h3|p|ul|ol|table)([^>]*)>([\s\S]*?)<\/\1>/g;
    let m;
    while ((m = re.exec(src))) {
      const [, tag, attrs, body] = m;
      if (tag === 'h3') {
        const t = plain(body);
        // Keep a heading on the same page as the table that follows it.
        const next = /^\s*<table(?![^>]*class="kv")[^>]*>([\s\S]*?)<\/table>/.exec(src.slice(re.lastIndex));
        if (next) {
          const trs = [...next[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((x) => [...x[1].matchAll(/<t[hd]>([\s\S]*?)<\/t[hd]>/g)].map((c) => c[1]));
          const th = this.layoutTable(trs).total;
          if (th <= H - M - 58 - BOTTOM - 60) this.need(th + headingSize * 1.35 + 30);
        }
        this.heading(t, { size: headingSize, hl: hlHeadings ? pickHighlight(t) : 0 });
      } else if (tag === 'p') this.para(body);
      else if (tag === 'ul' || tag === 'ol') this.list([...body.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => x[1]), tag === 'ol');
      else {
        const trs = [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((x) => [...x[1].matchAll(/<t[hd]>([\s\S]*?)<\/t[hd]>/g)].map((c) => c[1]));
        if (/class="kv"/.test(attrs)) this.kv(trs.map((r) => [plain(r[0]), r[1] || '']));
        else if (trs.length > 1) this.table(trs);
      }
    }
  }

  finish() {
    const n = this.pdf.getPageCount();
    this.pdf.getPages().forEach((p, i) => {
      if (p === this.cover) return;
      p.drawLine({ start: { x: M, y: FOOT_Y + 12 }, end: { x: W - M, y: FOOT_Y + 12 }, thickness: 0.7, color: HAIR });
      const left = this.safe(this.footer); const right = `Page ${i + 1} of ${n}`;
      const max = CW - this.reg.widthOfTextAtSize(right, 7.5) - 20;
      let l = left;
      while (this.reg.widthOfTextAtSize(l, 7.5) > max && l.length > 4) l = l.slice(0, -2);
      if (l !== left) l = l.trimEnd() + '...';
      p.drawText(l, { x: M, y: FOOT_Y, size: 7.5, font: this.reg, color: SOFT });
      p.drawText(right, { x: W - M - this.reg.widthOfTextAtSize(right, 7.5), y: FOOT_Y, size: 7.5, font: this.reg, color: SOFT });
    });
    return this.pdf.save();
  }
}

// Picks the key words of a heading to highlight: the words after a comma, or the last two, never starting on a small word.
function pickHighlight(t) {
  const ws = t.split(' ');
  const comma = t.indexOf(', ');
  if (comma > 0) return t.slice(comma + 2).split(' ').length;
  let n = ws.length >= 3 ? 2 : ws.length === 2 ? 1 : 1;
  while (n > 1 && /^(and|to|the|of|a|by|at|in|on|for)$/i.test(ws[ws.length - n])) n--;
  return n;
}

export async function agreementPdf({ name, address, start, email, signedAt, sentAt, ip, signaturePng, ref }) {
  const t = await setup(`Casual employment agreement, ${name}`, 'Signed casual employment agreement');
  const d = new Doc(t, { header: ['MyQuest Pty Ltd', 'ABN 65 693 175 405', 'hello@myquest.au  ·  0413 154 932'], footer: `Casual employment agreement  ·  ${name}` });
  d.newPage();
  d.heading('Casual employment agreement', { size: 24, hl: 1, before: 0, after: 10 });
  let cx = M;
  for (const c of [`Signed ${fmtDay(signedAt)}`, name]) {
    const w = d.semi.widthOfTextAtSize(d.safe(c), 8) + 30;
    if (cx + w > W - M && cx > M) { cx = M; d.y -= 22; }
    cx += d.chip(c, cx, d.y) + 6;
  }
  d.y -= 30;
  d.html(agreementHtml({ name, address, start }));

  // Signature block: MyQuest on the left, the employee on the right.
  d.need(250); d.y -= 6;
  d.heading('Signed', { size: 11.5, before: 4 });
  const p = d.page, colW = (CW - 14) / 2, xL = M, xR = M + colW + 14, top = d.y, bh = 168;
  const box = (x, title) => {
    p.drawSvgPath(rrPath(colW, bh, 14), { x, y: top, borderColor: INK, borderWidth: 1.3 });
    p.drawText(title, { x: x + 14, y: top - 22, size: 9.5, font: d.semi, color: INK });
    p.drawLine({ start: { x: x + 14, y: top - 78 }, end: { x: x + colW - 14, y: top - 78 }, thickness: 0.8, color: INK });
  };
  const detail = (x, k, v, dy) => {
    p.drawText(d.safe(k), { x: x + 14, y: top - dy, size: 7.5, font: d.reg, color: GREY });
    d.wrap(words(v), 8.5, colW - 28).slice(0, 2).forEach((l, i) => d.drawLine(p, l, x + 14, top - dy - 11 - i * 11, 8.5, INK));
  };
  box(xL, 'For MyQuest Pty Ltd'); box(xR, 'Employee');
  p.drawText('Harry Conway', { x: xL + 16, y: top - 70, size: 22, font: d.reg, color: INK, ySkew: degrees(14) });
  detail(xL, 'Name and position', 'Harry Conway, Director', 96);
  detail(xL, 'Signed', fmtWhen(sentAt), 126);
  if (signaturePng) {
    const img = await t.pdf.embedPng(signaturePng);
    const s = Math.min((colW - 28) / img.width, 44 / img.height);
    p.drawImage(img, { x: xR + 14, y: top - 76, width: img.width * s, height: img.height * s });
  } else {
    p.drawText('Not drawn (test link)', { x: xR + 14, y: top - 68, size: 9, font: d.reg, color: GREY });
  }
  detail(xR, 'Name (typed to sign)', name, 96);
  detail(xR, 'Signed', fmtWhen(signedAt), 126);
  d.y = top - bh - 12;
  d.panel(`Signed electronically at myquest.au/start. The employee opened a personal link sent to ${email}, read the agreement and both Fair Work information statements, ticked that they agree, typed their name and drew their signature. Sent from IP address ${ip || 'unknown'}. Reference ${ref}.`);
  return d.finish();
}

export async function handbookPdf({ name, givenAt }) {
  const t = await setup(`MyQuest Staff Handbook, ${name}`, 'MyQuest Staff Handbook');
  const d = new Doc(t, { header: ['Staff Handbook', `Copy for ${name}`], footer: `MyQuest Staff Handbook  ·  ${name}` });

  const c = t.pdf.addPage([W, H]); d.cover = c;
  c.drawRectangle({ x: 0, y: 0, width: W, height: H, color: INK });
  d.logo(c, M + 4, H - M - 4, 120, WHITE);
  let y = 420;
  let kx = M + 4;
  for (const ch of 'MYQUEST STAFF HANDBOOK') { c.drawText(ch, { x: kx, y, size: 9, font: t.semi, color: rgb(0.74, 0.74, 0.74) }); kx += t.semi.widthOfTextAtSize(ch, 9) + 1.6; }
  y -= 50;
  c.drawText('Everything about', { x: M + 4, y, size: 38, font: t.semi, color: WHITE });
  y -= 50;
  const big = 'working at MyQuest'; const bw = t.semi.widthOfTextAtSize(big, 38);
  c.drawSvgPath(rrPath(bw + 22, 48, 12), { x: M - 3, y: y + 38, color: HL });
  c.drawText(big, { x: M + 8, y, size: 38, font: t.semi, color: HLT });
  y -= 40;
  c.drawText('Life gets busy. We’ve got the cleaning covered.', { x: M + 4, y, size: 14, font: t.reg, color: MOTTO });
  y -= 30;
  const cardW = CW - 8;
  const nameLines = d.wrap(words(`<b>${name}</b>`), 14, cardW - 36);
  const cardH = 62 + nameLines.length * 17;
  c.drawSvgPath(rrPath(cardW, cardH, 16), { x: M + 4, y, color: WHITE });
  c.drawText('Your copy', { x: M + 22, y: y - 22, size: 8.5, font: t.reg, color: GREY });
  nameLines.forEach((l, i) => d.drawLine(c, l, M + 22, y - 42 - i * 17, 14, INK));
  c.drawText(d.safe(`Given with your signed agreement on ${fmtDay(givenAt)}`), { x: M + 22, y: y - 42 - nameLines.length * 17 - 4, size: 8.5, font: t.reg, color: INK });
  c.drawText('MyQuest Pty Ltd  ·  ABN 65 693 175 405  ·  hello@myquest.au  ·  0413 154 932  ·  myquest.au', { x: M + 4, y: M, size: 7.5, font: t.reg, color: COVER_SOFT });

  d.newPage();
  d.heading('MyQuest Staff Handbook', { size: 22, hl: 2, before: 0, after: 12 });
  d.html(HANDBOOK_HTML, { hlHeadings: true, headingSize: 14 });
  return d.finish();
}
