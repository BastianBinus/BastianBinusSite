// Page artwork, drawn into canvases at runtime so the page ships no image assets.
// Every draw function lays out in "logical" page space (lw x lh) and returns
// clickable regions in that same space.

export const FONT_SERIF = '"Instrument Serif", Georgia, serif';
export const FONT_SANS = '"Inter", system-ui, sans-serif';
export const FONT_DISPLAY = '"Space Grotesk", "Inter", sans-serif';

const PAPER = "#efe9df";
const INK = "#1c1a17";
const MUTED = "#6f675c";
const ACCENT = "#fda5b1";
const DARK = "#111216";

// Spread index a link jumps to. Spread n = n leaves flipped.
export const SPREAD = { contents: 1, about: 2, colorComposer: 3, ssg: 4, contact: 5 };

export const CONTACT = {
  email: "bastian.binus@pm.me",
  phone: "+41 77 223 34 42",
  phoneHref: "tel:+41772233442",
  github: "github.com/BastianBinus",
  githubHref: "https://github.com/BastianBinus",
};

function wrap(ctx, text, x, y, maxW, lineH) {
  const words = text.split(" ");
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineH;
}

function fill(ctx, lw, lh, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, lw, lh);
}

function folio(ctx, lw, lh, label, n, dark) {
  ctx.font = `500 ${lw * 0.022}px ${FONT_SANS}`;
  ctx.fillStyle = dark ? "rgba(255,255,255,0.45)" : MUTED;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillText(label.toUpperCase(), lw * 0.08, lh - lh * 0.05);
  ctx.textAlign = "right";
  ctx.fillText(String(n).padStart(2, "0"), lw * 0.92, lh - lh * 0.05);
  ctx.textAlign = "left";
}

function pill(ctx, x, y, label, size, bg, fg) {
  ctx.font = `600 ${size}px ${FONT_SANS}`;
  const w = ctx.measureText(label).width + size * 2;
  const h = size * 2.4;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + size, y + h / 2 + 1);
  ctx.textBaseline = "alphabetic";
  return { x, y, w, h };
}

// Size unit that works for both portrait and landscape pages.
const unit = (lw, lh) => Math.min(lw, lh * 0.88);

export const pages = {
  coverFront(ctx, lw, lh) {
    const g = ctx.createLinearGradient(0, 0, lw, lh);
    g.addColorStop(0, "#1a1b20");
    g.addColorStop(1, "#0b0b0d");
    fill(ctx, lw, lh, g);
    // fine grain
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
      ctx.fillRect(Math.random() * lw, Math.random() * lh, 2, 2);
    }
    const u = unit(lw, lh);
    ctx.fillStyle = "#e9e4dc";
    ctx.font = `400 ${u * 0.04}px ${FONT_SANS}`;
    ctx.textAlign = "center";
    ctx.fillText("● bastian binus", lw / 2, lh * 0.12);
    ctx.font = `400 ${u * 0.15}px ${FONT_SERIF}`;
    ctx.fillText("Portfolio", lw / 2, lh * 0.5);
    ctx.font = `italic 400 ${u * 0.06}px ${FONT_SERIF}`;
    ctx.fillStyle = ACCENT;
    ctx.fillText("Selected work, 2026", lw / 2, lh * 0.5 + u * 0.1);
    ctx.font = `500 ${u * 0.03}px ${FONT_SANS}`;
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText("TAP TO OPEN", lw / 2, lh * 0.9);
    ctx.textAlign = "left";
    return [];
  },

  coverInside(ctx, lw, lh) {
    fill(ctx, lw, lh, "#141519");
    const u = unit(lw, lh);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `400 ${u * 0.09}px ${FONT_SERIF}`;
    ctx.fillText("Hi. I'm", lw * 0.08, lh * 0.3);
    ctx.fillText("Bastian.", lw * 0.08, lh * 0.3 + u * 0.1);
    ctx.font = `400 ${u * 0.034}px ${FONT_SANS}`;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    wrap(
      ctx,
      "IT apprentice at Pax in Switzerland. I build things for the web to understand how they work.",
      lw * 0.08,
      lh * 0.3 + u * 0.22,
      lw * 0.8,
      u * 0.05,
    );
    ctx.font = `500 ${u * 0.026}px ${FONT_SANS}`;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillText("SWIPE OR TAP A PAGE TO TURN", lw * 0.08, lh * 0.9);
    return [];
  },

  contents(ctx, lw, lh) {
    fill(ctx, lw, lh, PAPER);
    const u = unit(lw, lh);
    ctx.fillStyle = INK;
    ctx.font = `400 ${u * 0.11}px ${FONT_SERIF}`;
    ctx.fillText("Contents", lw * 0.08, lh * 0.18);
    const rows = [
      ["About", "02", SPREAD.about],
      ["Color Composer", "03", SPREAD.colorComposer],
      ["Static Site Generator", "04", SPREAD.ssg],
      ["Get in touch", "05", SPREAD.contact],
    ];
    const links = [];
    let y = lh * 0.32;
    const rowH = Math.min(lh * 0.13, u * 0.13);
    for (const [label, num, spread] of rows) {
      ctx.strokeStyle = "rgba(28,26,23,0.18)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lw * 0.08, y);
      ctx.lineTo(lw * 0.92, y);
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = `500 ${u * 0.045}px ${FONT_SANS}`;
      ctx.fillText(label, lw * 0.08, y + rowH * 0.62);
      ctx.textAlign = "right";
      ctx.fillStyle = MUTED;
      ctx.font = `400 ${u * 0.04}px ${FONT_SERIF}`;
      ctx.fillText(num, lw * 0.92, y + rowH * 0.62);
      ctx.textAlign = "left";
      links.push({ x: lw * 0.05, y, w: lw * 0.9, h: rowH, spread });
      y += rowH;
    }
    folio(ctx, lw, lh, "Contents", 1);
    return links;
  },

  about(ctx, lw, lh) {
    fill(ctx, lw, lh, PAPER);
    const u = unit(lw, lh);
    ctx.fillStyle = INK;
    ctx.font = `400 ${u * 0.11}px ${FONT_SERIF}`;
    ctx.fillText("About", lw * 0.08, lh * 0.18);
    ctx.font = `400 ${u * 0.038}px ${FONT_SANS}`;
    ctx.fillStyle = "#3a352e";
    let y = wrap(
      ctx,
      "Computers have been part of my life since I was a kid. My first Raspberry Pi got me into IT, and I stayed: I'm now in the second year of my IT apprenticeship at Pax.",
      lw * 0.08,
      lh * 0.3,
      lw * 0.84,
      u * 0.057,
    );
    wrap(
      ctx,
      "On the side I build my own projects, mostly with HTML, CSS and JavaScript, lately also Java, Bash and SQL.",
      lw * 0.08,
      y + u * 0.03,
      lw * 0.84,
      u * 0.057,
    );
    folio(ctx, lw, lh, "About", 2);
    return [];
  },

  skills(ctx, lw, lh) {
    fill(ctx, lw, lh, PAPER);
    const u = unit(lw, lh);
    ctx.fillStyle = MUTED;
    ctx.font = `500 ${u * 0.028}px ${FONT_SANS}`;
    ctx.fillText("STACK", lw * 0.08, lh * 0.12);
    let x = lw * 0.08;
    let y = lh * 0.15;
    for (const s of ["HTML", "CSS", "JavaScript", "Java", "Bash", "SQL"]) {
      ctx.font = `600 ${u * 0.032}px ${FONT_SANS}`;
      const w = ctx.measureText(s).width + u * 0.064;
      if (x + w > lw * 0.92) {
        x = lw * 0.08;
        y += u * 0.09;
      }
      pill(ctx, x, y, s, u * 0.032, INK, PAPER);
      x += w + u * 0.02;
    }
    ctx.fillStyle = MUTED;
    ctx.font = `500 ${u * 0.028}px ${FONT_SANS}`;
    y += u * 0.2;
    ctx.fillText("TIMELINE", lw * 0.08, y);
    const steps = [
      ["Steinerschule Aesch", "Primary · 1–3"],
      ["Unica Liestal", "Primary · 4–7"],
      ["Gerenmatt Arlesheim", "Secondary · 7–9"],
      ["Apprenticeship at Pax", "2nd year · now"],
    ];
    y += u * 0.06;
    const stepH = Math.min(u * 0.11, (lh * 0.88 - y) / steps.length);
    steps.forEach(([a, b], i) => {
      const cy = y + i * stepH;
      ctx.fillStyle = i === steps.length - 1 ? ACCENT : INK;
      ctx.beginPath();
      ctx.arc(lw * 0.09, cy, u * 0.012, 0, Math.PI * 2);
      ctx.fill();
      if (i < steps.length - 1) {
        ctx.fillStyle = "rgba(28,26,23,0.2)";
        ctx.fillRect(lw * 0.09 - 1, cy + u * 0.015, 2, stepH - u * 0.03);
      }
      ctx.fillStyle = INK;
      ctx.font = `500 ${u * 0.036}px ${FONT_SANS}`;
      ctx.fillText(a, lw * 0.13, cy + u * 0.012);
      ctx.textAlign = "right";
      ctx.fillStyle = MUTED;
      ctx.font = `400 ${u * 0.03}px ${FONT_SANS}`;
      ctx.fillText(b, lw * 0.92, cy + u * 0.012);
      ctx.textAlign = "left";
    });
    folio(ctx, lw, lh, "About", 3);
    return [];
  },

  colorComposerVisual(ctx, lw, lh) {
    fill(ctx, lw, lh, DARK);
    const u = unit(lw, lh);
    ctx.fillStyle = "#fff";
    ctx.font = `400 ${u * 0.1}px ${FONT_SERIF}`;
    ctx.fillText("Color", lw * 0.08, lh * 0.17);
    ctx.font = `italic 400 ${u * 0.1}px ${FONT_SERIF}`;
    ctx.fillStyle = ACCENT;
    ctx.fillText("Composer", lw * 0.08, lh * 0.17 + u * 0.1);
    // swatch
    const h = 348,
      s = 96,
      l = 82;
    const sw = { x: lw * 0.08, y: lh * 0.38, w: lw * 0.84, h: lh * 0.2 };
    ctx.fillStyle = `hsl(${h} ${s}% ${l}%)`;
    ctx.beginPath();
    ctx.roundRect(sw.x, sw.y, sw.w, sw.h, u * 0.03);
    ctx.fill();
    // sliders
    const tracks = [
      (t) => `hsl(${t * 360} 90% 60%)`,
      (t) => `hsl(${h} ${t * 100}% 60%)`,
      (t) => `hsl(${h} 90% ${t * 100}%)`,
    ];
    const vals = [h / 360, s / 100, l / 100];
    let y = sw.y + sw.h + lh * 0.07;
    const trackH = u * 0.025;
    tracks.forEach((fn, i) => {
      const g = ctx.createLinearGradient(sw.x, 0, sw.x + sw.w, 0);
      for (let t = 0; t <= 1.001; t += 0.1) g.addColorStop(Math.min(t, 1), fn(t));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(sw.x, y, sw.w, trackH, trackH / 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(sw.x + sw.w * vals[i], y + trackH / 2, trackH * 0.9, 0, Math.PI * 2);
      ctx.fill();
      y += Math.min(lh * 0.06, u * 0.08);
    });
    // value chips
    const chips = ["#FDA5B1", "rgb(253,165,177)", "hsl(348 96% 82%)"];
    let x = sw.x;
    y += u * 0.01;
    for (const c of chips) {
      const r = pill(ctx, x, y, c, u * 0.024, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.85)");
      x += r.w + u * 0.015;
      if (x > lw * 0.75) {
        x = sw.x;
        y += r.h + u * 0.015;
      }
    }
    folio(ctx, lw, lh, "Project 01", 4, true);
    return [];
  },

  colorComposerText(ctx, lw, lh) {
    fill(ctx, lw, lh, PAPER);
    const u = unit(lw, lh);
    ctx.fillStyle = MUTED;
    ctx.font = `500 ${u * 0.028}px ${FONT_SANS}`;
    ctx.fillText("PROJECT 01 · HTML / CSS / JS", lw * 0.08, lh * 0.12);
    ctx.fillStyle = INK;
    ctx.font = `400 ${u * 0.075}px ${FONT_SERIF}`;
    const y = wrap(
      ctx,
      "Pick a color, copy every format.",
      lw * 0.08,
      lh * 0.22,
      lw * 0.84,
      u * 0.085,
    );
    ctx.font = `400 ${u * 0.036}px ${FONT_SANS}`;
    ctx.fillStyle = "#3a352e";
    wrap(
      ctx,
      "Hue, saturation and lightness turn into HSL, RGB and hex, each one click to copy. I wrote the RGB-to-hex conversion myself to understand the math, and the slider tracks are driven by CSS custom properties so the gradients update live while you drag.",
      lw * 0.08,
      y + u * 0.03,
      lw * 0.84,
      u * 0.055,
    );
    const b = pill(ctx, lw * 0.08, lh * 0.8, "Open live demo →", u * 0.034, INK, PAPER);
    folio(ctx, lw, lh, "Project 01", 5);
    return [{ ...b, href: "../ColorPicker/Color-Composer.html" }];
  },

  ssgVisual(ctx, lw, lh) {
    fill(ctx, lw, lh, DARK);
    const u = unit(lw, lh);
    ctx.fillStyle = "#fff";
    ctx.font = `400 ${u * 0.1}px ${FONT_SERIF}`;
    ctx.fillText("Static Site", lw * 0.08, lh * 0.17);
    ctx.font = `italic 400 ${u * 0.1}px ${FONT_SERIF}`;
    ctx.fillStyle = "#9fc5ff";
    ctx.fillText("Generator", lw * 0.08, lh * 0.17 + u * 0.1);
    const t = { x: lw * 0.08, y: lh * 0.36, w: lw * 0.84, h: lh * 0.52 };
    ctx.fillStyle = "#1b1d24";
    ctx.beginPath();
    ctx.roundRect(t.x, t.y, t.w, t.h, u * 0.025);
    ctx.fill();
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(t.x + u * 0.04 + i * u * 0.032, t.y + u * 0.035, u * 0.01, 0, Math.PI * 2);
      ctx.fill();
    });
    const lines = [
      ["#9aa0ad", "$ node build.js"],
      ["#e6e6e6", "  reading src/ …"],
      ["#7ee787", "  ✓ index.md      → index.html"],
      ["#7ee787", "  ✓ about.ejs     → about.html"],
      ["#7ee787", "  ✓ contact.html  → contact.html"],
      ["#e6e6e6", "  3 pages written to dist/"],
      ["#9aa0ad", "$ ▍"],
    ];
    ctx.font = `400 ${u * 0.03}px ui-monospace, Menlo, monospace`;
    const lineH = Math.min(u * 0.052, (t.h - u * 0.1) / lines.length);
    lines.forEach(([c, s], i) => {
      ctx.fillStyle = c;
      ctx.fillText(s, t.x + u * 0.04, t.y + u * 0.1 + i * lineH);
    });
    folio(ctx, lw, lh, "Project 02", 6, true);
    return [];
  },

  ssgText(ctx, lw, lh) {
    fill(ctx, lw, lh, PAPER);
    const u = unit(lw, lh);
    ctx.fillStyle = MUTED;
    ctx.font = `500 ${u * 0.028}px ${FONT_SANS}`;
    ctx.fillText("PROJECT 02 · NODE.JS", lw * 0.08, lh * 0.12);
    ctx.fillStyle = INK;
    ctx.font = `400 ${u * 0.075}px ${FONT_SERIF}`;
    const y = wrap(
      ctx,
      "One command, a finished site.",
      lw * 0.08,
      lh * 0.22,
      lw * 0.84,
      u * 0.085,
    );
    ctx.font = `400 ${u * 0.036}px ${FONT_SANS}`;
    ctx.fillStyle = "#3a352e";
    wrap(
      ctx,
      "A static site generator built with Node.js. It takes Markdown, EJS and plain HTML, picks the right template engine per file, renders every page and writes clean HTML output.",
      lw * 0.08,
      y + u * 0.03,
      lw * 0.84,
      u * 0.055,
    );
    const b = pill(ctx, lw * 0.08, lh * 0.8, "Open project →", u * 0.034, INK, PAPER);
    folio(ctx, lw, lh, "Project 02", 7);
    return [{ ...b, href: "../Public-Site-Generator/index.html" }];
  },

  nextChapter(ctx, lw, lh) {
    fill(ctx, lw, lh, DARK);
    const u = unit(lw, lh);
    // soft aura
    const g = ctx.createRadialGradient(lw * 0.5, lh * 0.45, 0, lw * 0.5, lh * 0.45, u * 0.6);
    g.addColorStop(0, "rgba(253,165,177,0.35)");
    g.addColorStop(0.5, "rgba(120,110,255,0.12)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, lw, lh);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = `400 ${u * 0.1}px ${FONT_SERIF}`;
    ctx.fillText("Next chapter", lw / 2, lh * 0.45);
    ctx.font = `italic 400 ${u * 0.05}px ${FONT_SERIF}`;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("currently being written", lw / 2, lh * 0.45 + u * 0.08);
    ctx.textAlign = "left";
    folio(ctx, lw, lh, "In progress", 8, true);
    return [];
  },

  contact(ctx, lw, lh) {
    fill(ctx, lw, lh, PAPER);
    const u = unit(lw, lh);
    ctx.fillStyle = INK;
    ctx.font = `400 ${u * 0.11}px ${FONT_SERIF}`;
    ctx.fillText("Get in", lw * 0.08, lh * 0.2);
    ctx.font = `italic 400 ${u * 0.11}px ${FONT_SERIF}`;
    ctx.fillText("touch.", lw * 0.08, lh * 0.2 + u * 0.11);
    const rows = [
      ["EMAIL", CONTACT.email, "mailto:" + CONTACT.email],
      ["PHONE", CONTACT.phone, CONTACT.phoneHref],
      ["GITHUB", CONTACT.github, CONTACT.githubHref],
    ];
    const links = [];
    let y = lh * 0.2 + u * 0.24;
    const rowH = Math.min(u * 0.13, (lh * 0.88 - y) / rows.length);
    for (const [label, value, href] of rows) {
      ctx.fillStyle = MUTED;
      ctx.font = `500 ${u * 0.026}px ${FONT_SANS}`;
      ctx.fillText(label, lw * 0.08, y + rowH * 0.32);
      ctx.fillStyle = INK;
      ctx.font = `500 ${u * 0.042}px ${FONT_SANS}`;
      ctx.fillText(value + "  ↗", lw * 0.08, y + rowH * 0.75);
      links.push({ x: lw * 0.05, y, w: lw * 0.9, h: rowH, href });
      y += rowH;
    }
    folio(ctx, lw, lh, "Contact", 9);
    return links;
  },

  backInside(ctx, lw, lh) {
    fill(ctx, lw, lh, "#141519");
    return [];
  },
};

// Small textures for the desk props.
export function cardArt(ctx, w, h) {
  ctx.fillStyle = "#0d0d0f";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#e9e4dc";
  ctx.font = `400 ${h * 0.2}px ${FONT_SERIF}`;
  ctx.fillText("Bastian Binus", w * 0.08, h * 0.42);
  ctx.font = `500 ${h * 0.07}px ${FONT_SANS}`;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("IT · WEB · TAP ME", w * 0.08, h * 0.58);
  // NFC waves
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = h * 0.02;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(w * 0.82, h * 0.78, h * 0.05 * i, -Math.PI / 4, Math.PI / 4);
    ctx.stroke();
  }
}

export function latteArt(ctx, s) {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "#c08a5b");
  g.addColorStop(0.7, "#8a5532");
  g.addColorStop(1, "#4a2a16");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = "#f3e6d3";
  ctx.beginPath();
  const cx = s / 2,
    cy = s * 0.52,
    r = s * 0.17;
  ctx.moveTo(cx, cy + r * 1.3);
  ctx.bezierCurveTo(cx - r * 2.2, cy - r * 0.2, cx - r * 0.9, cy - r * 1.9, cx, cy - r * 0.6);
  ctx.bezierCurveTo(cx + r * 0.9, cy - r * 1.9, cx + r * 2.2, cy - r * 0.2, cx, cy + r * 1.3);
  ctx.fill();
}

export function woodArt(ctx, s) {
  ctx.fillStyle = "#1d1814";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) {
    const y = Math.random() * s;
    const amp = 2 + Math.random() * 6;
    const freq = 0.004 + Math.random() * 0.01;
    const phase = Math.random() * 10;
    const light = Math.random() < 0.5;
    ctx.strokeStyle = light
      ? `rgba(120,100,85,${0.04 + Math.random() * 0.08})`
      : `rgba(0,0,0,${0.1 + Math.random() * 0.2})`;
    ctx.lineWidth = 0.5 + Math.random() * 3;
    ctx.beginPath();
    for (let x = 0; x <= s; x += 16) {
      const yy = y + Math.sin(x * freq + phase) * amp;
      x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
}

export function softDot(ctx, s) {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
}
