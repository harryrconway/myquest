import { PDFDocument, StandardFonts, rgb } from './_vendor/pdf-lib.esm.min.js';
import { agreementHtml } from './_onboard-docs.js';

const INK = rgb(0.067, 0.067, 0.067);
const GREY = rgb(0.33, 0.33, 0.33);
const HAIR = rgb(0.85, 0.85, 0.84);
const GREEN = rgb(0.114, 0.361, 0.165);

const decode = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
// The standard PDF fonts only cover Windows 1252, so swap anything outside it for a close match.
const safe = (s) => String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7E -ÿ×]/g, '');

// Turn the agreement's HTML into blocks the PDF can lay out: key value rows, headings and paragraphs.
function blocks(html) {
  const out = [];
  const re = /<(h3|p|tr)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[1] === 'tr') {
      const th = /<th>([\s\S]*?)<\/th>/.exec(m[2]); const td = /<td>([\s\S]*?)<\/td>/.exec(m[2]);
      if (th && td) out.push({ t: 'kv', k: decode(th[1]), v: decode(td[1]) });
    } else if (m[1] === 'h3') out.push({ t: 'h', s: decode(m[2]) });
    else {
      const b = /^\s*<b>([\s\S]*?)<\/b>/.exec(m[2]);
      out.push({ t: 'p', lead: b ? decode(b[1]) : '', s: decode(b ? m[2].slice(b[0].length) : m[2]) });
    }
  }
  return out;
}

function wrap(text, font, size, width) {
  const words = safe(text).split(' ');
  const lines = []; let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > width && line) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

const fmtWhen = (d) => d.toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' (Brisbane time)';

export async function agreementPdf({ name, address, start, email, signedAt, sentAt, ip, signaturePng, ref }) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Casual employment agreement, ${safe(name)}`);
  pdf.setAuthor('MyQuest Pty Ltd');
  pdf.setSubject('Signed casual employment agreement');
  pdf.setCreator('myquest.au/start');
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ital = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const W = 595.28, H = 841.89, M = 56, CW = W - M * 2;
  let page, y;
  const pages = [];
  const newPage = () => { page = pdf.addPage([W, H]); pages.push(page); y = H - M; };
  const need = (h) => { if (y - h < M + 30) newPage(); };
  newPage();

  page.drawText('MyQuest Pty Ltd', { x: M, y, size: 11, font: bold, color: INK });
  page.drawText('ABN 65 693 175 405  |  hello@myquest.au  |  0413 154 932', { x: M, y: y - 14, size: 9, font: reg, color: GREY });
  y -= 52;
  page.drawText('Casual employment agreement', { x: M, y, size: 22, font: bold, color: INK });
  y -= 30;

  for (const b of blocks(agreementHtml({ name, address, start }))) {
    if (b.t === 'kv') {
      const kw = 150; const vl = wrap(b.v, reg, 10, CW - kw - 8);
      need(vl.length * 13 + 8);
      page.drawText(safe(b.k), { x: M, y, size: 10, font: bold, color: INK });
      vl.forEach((l, i) => page.drawText(l, { x: M + kw, y: y - i * 13, size: 10, font: reg, color: INK }));
      y -= vl.length * 13 + 6;
      page.drawLine({ start: { x: M, y: y + 3 }, end: { x: W - M, y: y + 3 }, thickness: 0.5, color: HAIR });
      y -= 6;
    } else if (b.t === 'h') {
      need(40); y -= 10;
      page.drawText(safe(b.s), { x: M, y, size: 12.5, font: bold, color: INK });
      y -= 18;
    } else {
      const lead = b.lead ? `${b.lead} ` : '';
      const lines = wrap(lead + b.s, reg, 10, CW);
      need(lines.length * 14 + 6);
      lines.forEach((l, i) => {
        if (i === 0 && lead) {
          page.drawText(safe(lead), { x: M, y, size: 10, font: bold, color: INK });
          page.drawText(l.slice(safe(lead).length), { x: M + bold.widthOfTextAtSize(safe(lead), 10), y, size: 10, font: reg, color: INK });
        } else page.drawText(l, { x: M, y: y - i * 14, size: 10, font: reg, color: INK });
      });
      y -= lines.length * 14 + 6;
    }
  }

  // Signature block: MyQuest on the left, the employee on the right.
  need(230); y -= 16;
  page.drawText('Signed', { x: M, y, size: 12.5, font: bold, color: INK });
  y -= 22;
  const colW = (CW - 24) / 2, xL = M, xR = M + colW + 24, top = y;
  const box = (x, title) => {
    page.drawRectangle({ x, y: top - 176, width: colW, height: 176, borderColor: HAIR, borderWidth: 1 });
    page.drawText(title, { x: x + 12, y: top - 18, size: 10, font: bold, color: INK });
  };
  box(xL, 'For MyQuest Pty Ltd'); box(xR, 'Employee');
  const line = (x, k, v, dy) => {
    page.drawText(k, { x: x + 12, y: top - dy, size: 8.5, font: reg, color: GREY });
    wrap(v, reg, 9.5, colW - 24).slice(0, 2).forEach((l, i) => page.drawText(l, { x: x + 12, y: top - dy - 12 - i * 11, size: 9.5, font: reg, color: INK }));
  };
  // MyQuest signs by its director's typed signature, added when the employee sends.
  page.drawText('Harry Conway', { x: xL + 12, y: top - 66, size: 24, font: ital, color: INK });
  page.drawLine({ start: { x: xL + 12, y: top - 74 }, end: { x: xL + colW - 12, y: top - 74 }, thickness: 0.7, color: INK });
  line(xL, 'Name and position', 'Harry Conway, Director', 92);
  line(xL, 'Signed', fmtWhen(sentAt), 124);

  if (signaturePng) {
    const img = await pdf.embedPng(signaturePng);
    const s = Math.min((colW - 24) / img.width, 46 / img.height);
    page.drawImage(img, { x: xR + 12, y: top - 73, width: img.width * s, height: img.height * s });
  } else {
    page.drawText('Not drawn (test link)', { x: xR + 12, y: top - 66, size: 10, font: reg, color: GREY });
  }
  page.drawLine({ start: { x: xR + 12, y: top - 74 }, end: { x: xR + colW - 12, y: top - 74 }, thickness: 0.7, color: INK });
  line(xR, 'Name (typed to sign)', name, 92);
  line(xR, 'Signed', fmtWhen(signedAt), 124);
  y = top - 192;

  need(60);
  const audit = `Signed electronically at myquest.au/start. The employee opened a personal link sent to ${email}, read the agreement and both Fair Work information statements, ticked that they agree, typed their name and drew their signature. Sent from IP address ${ip || 'unknown'}. Reference ${ref}.`;
  wrap(audit, reg, 8.5, CW).forEach((l, i) => page.drawText(l, { x: M, y: y - i * 11, size: 8.5, font: reg, color: GREY }));

  pages.forEach((p, i) => {
    p.drawText(`Casual employment agreement  |  ${safe(name)}  |  Page ${i + 1} of ${pages.length}`, { x: M, y: 30, size: 8, font: reg, color: GREY });
  });
  return pdf.save();
}
