/* One renderer powers both the editor and the exported PNG. */
window.Mochi = {
  photos: [],
  options: {
    frame: "pink",
    filter: "Original",
    caption: "just us, being us.",
    date: true,
    decoration: "hearts",
    layout: "strip",
  },
  colors: {
    pink: "#FADADD",
    white: "#FFFFFF",
    black: "#252328",
    lavender: "#E8DFF5",
    blue: "#DCEBF5",
    cream: "#FFF4DF",
  },
  filters: {
    Original: "none",
    "Black & White": "grayscale(1)",
    Vintage: "sepia(.48) saturate(.75) contrast(.92)",
    Warm: "sepia(.25) saturate(1.18)",
    Cool: "saturate(.8) hue-rotate(16deg)",
    Soft: "contrast(.88) saturate(.8) brightness(1.1)",
  },
};
Mochi.photoHeight = function (photo = this.photos[0], width = 600) {
  return Math.round(width * (photo?.height || 450) / (photo?.width || 600));
};
Mochi.render = function (canvas) {
  const o = this.options,
    cols = o.layout === "grid" ? 2 : 1,
    rows = Math.ceil(this.photos.length / cols),
    pad = 48,
    gap = 24,
    photoW = 600,
    photoH = this.photoHeight(),
    footer = 210;
  canvas.width = pad * 2 + cols * photoW + (cols - 1) * gap;
  canvas.height = pad * 2 + rows * photoH + (rows - 1) * gap + footer;
  const c = canvas.getContext("2d");
  c.fillStyle = this.colors[o.frame];
  c.fillRect(0, 0, canvas.width, canvas.height);
  this.photos.forEach((photo, i) => {
    c.save();
    c.filter = this.filters[o.filter];
    c.drawImage(
      photo,
      pad + (i % cols) * (photoW + gap),
      pad + Math.floor(i / cols) * (photoH + gap),
      photoW,
      photoH,
    );
    c.restore();
  });
  const dark = o.frame === "black",
    ink = dark ? "#FFF9F5" : "#51413F",
    center = canvas.width / 2,
    y = canvas.height - footer;
  c.fillStyle = ink;
  c.textAlign = "center";
  c.font = "500 30px Quicksand, sans-serif";
  const caption = o.caption.trim();
  let size = 30;
  while (c.measureText(caption).width > canvas.width - pad * 2 && size > 15) {
    c.font = `500 ${--size}px Quicksand, sans-serif`;
  }
  c.fillText(caption, center, y + 36);
  c.font = "700 23px Quicksand, sans-serif";
  c.fillText("mochibooth", center, y + 88);
  if (o.date) {
    c.font = '15px "DM Sans", sans-serif';
    c.fillText(
      new Date()
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
        .toUpperCase(),
      center,
      y + 123,
    );
  }
  const decorations = { hearts: "♡", stars: "✧", flowers: "✿" };
  if (decorations[o.decoration]) {
    c.font = "38px sans-serif";
    c.fillText(decorations[o.decoration], pad + 22, y + 83);
    c.fillText(decorations[o.decoration], canvas.width - pad - 22, y + 83);
  }
};

// Patterned frames use the same canvas for preview and PNG export.
Object.assign(Mochi.colors, { polkadot: "#FFF5F8", pinkie: "#FFD1E2" });
Mochi.drawFramePattern = function (canvas) {
  const frame = this.options.frame;
  if (frame !== "polkadot" && frame !== "pinkie") return;
  const ctx = canvas.getContext("2d");
  const columns = this.options.layout === "grid" ? 2 : 1, photoH = this.photoHeight();
  ctx.save();
  // Clip decorations to the paper; leave photos and footer text untouched.
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);
  this.photos.forEach((photo, index) => {
    ctx.rect(48 + (index % columns) * 624, 48 + Math.floor(index / columns) * (photoH + 24), 600, photoH);
  });
  ctx.rect(48, canvas.height - 210, canvas.width - 96, 160);
  ctx.clip("evenodd");
  if (frame === "polkadot") {
    const palette = ["#EBA7BC", "#CFBDE8", "#D9C8A7"];
    for (let row = 0, y = 12; y < canvas.height; y += 30, row++) {
      for (let col = 0, x = 12 + (row % 2) * 15; x < canvas.width; x += 30, col++) {
        ctx.fillStyle = palette[(row + col) % palette.length];
        ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else {
    ctx.strokeStyle = "#E996B4";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 7]);
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    ctx.setLineDash([]);
    for (let y = 24; y < canvas.height; y += 118) {
      for (const x of [24, canvas.width - 24]) {
        ctx.fillStyle = "#D96F98";
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.bezierCurveTo(x - 24, y - 20, x - 24, y + 20, x, y);
        ctx.moveTo(x, y); ctx.bezierCurveTo(x + 24, y - 20, x + 24, y + 20, x, y);
        ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#FFF5F8"; ctx.fill();
        ctx.strokeStyle = "#D96F98";
        ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x - 7, y + 18);
        ctx.moveTo(x, y + 2); ctx.lineTo(x + 7, y + 18); ctx.stroke();
      }
    }
  }
  ctx.restore();
};
const renderPlainStrip = Mochi.render;
Mochi.render = function (canvas) {
  renderPlainStrip.call(this, canvas);
  this.drawFramePattern(canvas);
};

// Curated frame library. Each design is rendered into the exported canvas.
Mochi.frames = {
  polkadot: { name: "Polkadot", group: "Playful", bg: "#FFF5F8" },
  pinkie: { name: "Pinkie Ribbon", group: "Romantic", bg: "#FFD1E2" },
  gingham: { name: "Picnic Gingham", group: "Patterns", bg: "#FFF6F0", ink: "#E7A8A2", type: "gingham" },
  matcha: { name: "Matcha Check", group: "Patterns", bg: "#F4F5E9", ink: "#A4B797", type: "gingham" },
  checker: { name: "Lilac Checker", group: "Patterns", bg: "#F9F3FF", ink: "#C9B4DE", type: "checker" },
  candy: { name: "Candy Stripe", group: "Patterns", bg: "#FFF6EF", ink: "#F1B2BF", type: "stripes" },
  waves: { name: "Ocean Waves", group: "Patterns", bg: "#EDF8FC", ink: "#8EC8DA", type: "waves" },
  cherry: { name: "Cherry Club", group: "Playful", bg: "#FFF4ED", ink: "#C8546C", type: "cherry" },
  daisy: { name: "Daisy Day", group: "Nature", bg: "#F5F1D9", ink: "#D9AD50", type: "daisy" },
  tulip: { name: "Tulip Garden", group: "Nature", bg: "#F8F1E9", ink: "#DC8BA7", type: "tulip" },
  cloud: { name: "Cloud Nine", group: "Dreamy", bg: "#DDEEF9", ink: "#FFFFFF", type: "cloud" },
  celestial: { name: "Moonlight", group: "Dreamy", bg: "#EBE4F7", ink: "#9680B6", type: "moon" },
  hearts: { name: "Love Letters", group: "Romantic", bg: "#FFECEF", ink: "#D8819A", type: "heart" },
  lace: { name: "Pearl Lace", group: "Romantic", bg: "#F3E5ED", ink: "#FFFFFF", type: "lace" },
  confetti: { name: "Birthday Confetti", group: "Playful", bg: "#FFF8E6", ink: "#D99EA6", type: "confetti" },
  scrapbook: { name: "Dear Diary", group: "Vintage", bg: "#F4EAD8", ink: "#B2B9BD", type: "paper" },
  film: { name: "Analog Film", group: "Vintage", bg: "#F5EDD9", ink: "#38312F", type: "film" },
  postage: { name: "Air Mail", group: "Vintage", bg: "#FFF7E9", ink: "#BE7C7A", type: "postage" },
  butterfly: { name: "Butterfly Kiss", group: "Nature", bg: "#F3ECFA", ink: "#AF8CC8", type: "butterfly" },
  smile: { name: "Happy Together", group: "Playful", bg: "#FFF1CA", ink: "#B99B5C", type: "smile" }
};
for (const [key, frame] of Object.entries(Mochi.frames)) Mochi.colors[key] = frame.bg;
Mochi.options.frame = "pinkie";
const drawOriginalPattern = Mochi.drawFramePattern;
Mochi.drawFramePattern = function (canvas) {
  const f = this.frames[this.options.frame];
  if (!f) return;
  if (!f.type) return drawOriginalPattern.call(this, canvas);
  const c = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
  const cols = this.options.layout === "grid" ? 2 : 1, photoH = this.photoHeight();
  c.save(); c.beginPath(); c.rect(0, 0, w, h);
  this.photos.forEach((p, i) => c.rect(48 + (i % cols) * 624, 48 + Math.floor(i / cols) * (photoH + 24), 600, photoH));
  c.rect(48, h - 210, w - 96, 160); c.clip("evenodd");
  c.fillStyle = f.ink; c.strokeStyle = f.ink; c.lineWidth = 2;
  const circle = (x, y, r, color) => { c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
  if (f.type === "gingham" || f.type === "checker") {
    for (let y = 0; y < h; y += 24) for (let x = 0; x < w; x += 24) {
      c.globalAlpha = f.type === "gingham" ? ((x / 24) % 2 + (y / 24) % 2) * 0.22 : ((x / 24 + y / 24) % 2) * 0.65;
      c.fillRect(x, y, 24, 24);
    } c.globalAlpha = 1;
  } else if (f.type === "stripes" || f.type === "postage") {
    c.lineWidth = f.type === "postage" ? 17 : 10;
    for (let x = -h; x < w; x += 32) {
      c.strokeStyle = f.type === "postage" && (Math.floor(x / 32) % 2 === 0) ? "#8CAFC4" : f.ink;
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x + h, h); c.stroke();
    }
  } else if (f.type === "waves") {
    for (let y = 0; y < h; y += 22) { c.beginPath(); c.moveTo(0, y);
      for (let x = 0; x < w; x += 24) c.quadraticCurveTo(x + 12, y + (x % 48 ? -9 : 9), x + 24, y); c.stroke(); }
  } else if (f.type === "paper") {
    for (let y = 12; y < h; y += 25) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.strokeStyle = "#D9A5A0"; c.beginPath(); c.moveTo(25, 0); c.lineTo(25, h); c.stroke();
    c.fillStyle = "#D5B889"; for (let y = 55; y < h - 210; y += photoH + 24) { c.fillRect(38, y - 24, 95, 19); c.fillRect(w - 133, y - 24, 95, 19); }
  } else if (f.type === "film") {
    c.fillStyle = f.ink; c.fillRect(0, 0, w, h);
    for (let y = 12; y < h; y += 38) { c.fillStyle = "#F5EDD9"; c.fillRect(13, y, 19, 24); c.fillRect(w - 32, y, 19, 24); }
    c.font = "12px monospace"; c.textAlign = "center"; c.fillStyle = "#E2B866";
    for (let y = 60, n = 1; y < h - 210; y += photoH + 24, n++) c.fillText(`${String(n).padStart(2, "0")} MOCHI 400`, w / 2, y - 25);
  } else if (f.type === "lace") {
    for (let y = 8; y < h; y += 20) for (const x of [13, w - 13]) { circle(x, y, 10, "#FFFFFF"); circle(x, y, 4, f.bg); }
    c.setLineDash([2, 5]); c.strokeRect(29, 12, w - 58, h - 24);
  } else {
    for (let y = 24, row = 0; y < h; y += 80, row++) for (let x = 24; x < w; x += 80) {
      c.save(); c.translate(x, y); c.fillStyle = f.ink; c.strokeStyle = f.ink;
      if (f.type === "cherry") {
        c.strokeStyle = "#799267"; c.beginPath(); c.moveTo(-7, 4); c.quadraticCurveTo(0, -4, 1, -12); c.lineTo(9, 4); c.stroke(); circle(-8, 7, 7, f.ink); circle(9, 7, 7, "#E48D91");
      } else if (f.type === "daisy") {
        for (let n = 0; n < 6; n++) circle(Math.cos(n * Math.PI / 3) * 8, Math.sin(n * Math.PI / 3) * 8, 6, "#FFFFFF"); circle(0, 0, 4, f.ink);
      } else if (f.type === "tulip") {
        c.strokeStyle = "#8EA37D"; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 17); c.moveTo(0, 12); c.lineTo(8, 7); c.stroke();
        c.beginPath(); c.moveTo(-10, -9); c.lineTo(-3, -4); c.lineTo(0, -12); c.lineTo(4, -4); c.lineTo(10, -9); c.quadraticCurveTo(11, 9, 0, 6); c.quadraticCurveTo(-11, 9, -10, -9); c.fill();
      } else if (f.type === "cloud") { circle(-8, 2, 8, f.ink); circle(0, -3, 10, f.ink); circle(10, 2, 7, f.ink); c.fillRect(-8, 2, 18, 7);
      } else if (f.type === "moon") { circle(0, 0, 11, f.ink); circle(5, -4, 9, f.bg); c.fillStyle = "#B49A6E"; c.fillRect(16, 12, 3, 3);
      } else if (f.type === "heart") { c.beginPath(); c.moveTo(0, 11); c.bezierCurveTo(-25, -4, -8, -18, 0, -5); c.bezierCurveTo(8, -18, 25, -4, 0, 11); c.fill();
      } else if (f.type === "butterfly") {
        c.beginPath(); c.ellipse(-7, -3, 7, 11, -0.5, 0, Math.PI * 2); c.ellipse(7, -3, 7, 11, 0.5, 0, Math.PI * 2); c.fill(); circle(-5, 9, 5, "#DCC2EB"); circle(5, 9, 5, "#DCC2EB"); c.beginPath(); c.moveTo(0, -6); c.lineTo(0, 11); c.stroke();
      } else if (f.type === "smile") { circle(0, 0, 14, "#F5D77E"); circle(-4, -3, 1.5, "#796039"); circle(4, -3, 1.5, "#796039"); c.strokeStyle = "#796039"; c.beginPath(); c.arc(0, 1, 6, 0.2, Math.PI - 0.2); c.stroke();
      } else if (f.type === "confetti") {
        ["#E9A7BC", "#A7BDA2", "#B8A5D6", "#E4BD76"].forEach((color, n) => { c.fillStyle = color; c.save(); c.rotate(n + row); c.fillRect(n * 6 - 10, n * 7 - 12, 4, 10); c.restore(); });
      }
      c.restore();
    }
  }
  c.restore();
};

// Local photo effects: beauty glow and original analog-inspired presets.
Mochi.effects = {
  "Natural Glow": { group: "Glow", lift: 0.10, soft: 0.24, bloom: 0.10, tint: [3, 1, 0], sat: 1.02 },
  "Glass Skin": { group: "Glow", lift: 0.14, soft: 0.38, bloom: 0.17, tint: [1, 2, 3], sat: 0.94 },
  "Soft Portrait": { group: "Glow", lift: 0.08, soft: 0.42, bloom: 0.07, tint: [3, 0, 1], sat: 0.93 },
  "Peach Glow": { group: "Glow", lift: 0.11, soft: 0.26, bloom: 0.10, tint: [9, 2, -3], sat: 1.06 },
  "Rosy Milk": { group: "Glow", lift: 0.13, soft: 0.30, bloom: 0.13, tint: [7, -2, 4], sat: 0.88 },
  "Golden Hour": { group: "Glow", lift: 0.07, soft: 0.16, bloom: 0.12, tint: [12, 5, -9], sat: 1.08 },
  "Film 400": { group: "Analog", contrast: 1.08, fade: 0.05, tint: [6, 3, -5], sat: 0.90, grain: 15, vignette: 0.13 },
  "Disposable 90s": { group: "Analog", contrast: 1.13, fade: 0.07, tint: [3, 7, -5], sat: 0.88, grain: 23, vignette: 0.22, leak: 0.20 },
  "CCD Flash": { group: "Analog", contrast: 1.17, lift: 0.07, tint: [-3, 1, 8], sat: 0.91, grain: 10, vignette: 0.17 },
  "Instant Cream": { group: "Analog", contrast: 0.89, fade: 0.10, tint: [10, 6, -7], sat: 0.77, grain: 9, vignette: 0.10 },
  "Cinema Teal": { group: "Analog", contrast: 1.13, tint: [-7, 6, 8], sat: 0.83, grain: 13, vignette: 0.19 },
  "Sunset Leak": { group: "Analog", contrast: 0.97, tint: [12, 1, -8], sat: 0.91, grain: 17, vignette: 0.15, leak: 0.48 },
  "Mono Film": { group: "Analog", contrast: 1.16, fade: 0.05, tint: [0, 0, 0], sat: 0, grain: 20, vignette: 0.18 },
  "Realistic Vintage": { group: "Analog", contrast: 1.12, fade: 0.10, soft: 0.06, tint: [12, 5, -6], sat: 0, grain: 9, vignette: 0.10 },
  "Dream Haze": { group: "Analog", contrast: 0.90, fade: 0.06, bloom: 0.24, tint: [6, 0, 8], sat: 0.78, grain: 8, leak: 0.12 }
};
Object.keys(Mochi.effects).forEach(name => Mochi.filters[name] = "none");
Mochi.options.intensity = 75;
Mochi.effectCache = new WeakMap();
Mochi.liveEffectBuffers = new WeakMap();
Mochi.liveCrownBuffers = new WeakMap();
Mochi.processPhoto = function (photo, name, strength, options) {
  const preset = this.effects[name], amount = Math.max(0, Math.min(100, Number(strength))) / 100;
  if (!preset || amount === 0) return photo;
  const width = Math.max(160, Math.min(600, options?.width || 600));
  const height = this.photoHeight(photo, width);
  const key = [name, amount, width].join(":");
  const cached = this.effectCache.get(photo); if (cached?.key === key) return cached.canvas;
  const buffers = options?.reuse ? (this.liveEffectBuffers.get(photo) || {}) : {};
  if (options?.reuse) this.liveEffectBuffers.set(photo, buffers);
  const canvas = buffers.canvas ||= document.createElement("canvas");
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(photo, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height), source = image.data;
  let smooth = null;
  if (preset.soft || preset.bloom) {
    const tiny = buffers.tiny ||= document.createElement("canvas");
    const tinyHeight = Math.round(100 * height / width);
    if (tiny.width !== 100 || tiny.height !== tinyHeight) { tiny.width = 100; tiny.height = tinyHeight; }
    tiny.getContext("2d").drawImage(canvas, 0, 0, tiny.width, tiny.height);
    const blurred = buffers.blurred ||= document.createElement("canvas");
    if (blurred.width !== width || blurred.height !== height) { blurred.width = width; blurred.height = height; }
    const bc = blurred.getContext("2d", { willReadFrequently: true }); bc.imageSmoothingEnabled = true; bc.imageSmoothingQuality = "high"; bc.drawImage(tiny, 0, 0, width, height);
    smooth = bc.getImageData(0, 0, width, height).data;
  }
  let seed = 19790527;
  for (let i = 0; i < source.length; i += 4) {
    const red = source[i], green = source[i + 1], blue = source[i + 2];
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const cb = 128 - 0.168736 * red - 0.331264 * green + 0.5 * blue;
    const cr = 128 + 0.5 * red - 0.418688 * green - 0.081312 * blue;
    const skin = cb > 72 && cb < 135 && cr > 128 && cr < 180 ? 1 : 0.12;
    const edge = smooth ? Math.max(0, 1 - Math.abs(luma - (smooth[i] + smooth[i + 1] + smooth[i + 2]) / 3) / 32) : 0;
    const px = (i / 4) % width, py = Math.floor(i / (width * 4));
    const radius = preset.vignette ? Math.pow((px - width / 2) / (width * 0.625), 2) + Math.pow((py - height / 2) / (height * 2 / 3), 2) : 0;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = ((seed / 4294967296) - 0.5) * (preset.grain || 0);
    const leak = preset.leak ? preset.leak * Math.exp(-(px * 600 / width) / 85) * (0.65 + 0.35 * Math.sin((py * 600 / width) / 110)) : 0;
    for (let channel = 0; channel < 3; channel++) {
      let value = (channel === 0 ? red : channel === 1 ? green : blue);
      if (smooth) value += (smooth[i + channel] - value) * (preset.soft || 0) * skin * edge;
      value = luma + (value - luma) * (preset.sat ?? 1);
      value = (value - 128) * (preset.contrast ?? 1) + 128;
      value += (255 - value) * (preset.lift || 0) * (0.45 + skin * 0.55);
      if (smooth && preset.bloom) value += (255 - value) * Math.pow(smooth[i + channel] / 255, 2) * preset.bloom;
      value += (preset.tint?.[channel] || 0);
      value = value * (1 - (preset.fade || 0)) + 140 * (preset.fade || 0);
      value *= 1 - Math.min(0.75, radius * (preset.vignette || 0));
      value += noise;
      const light = channel === 0 ? 255 : channel === 1 ? 115 : 45; value += (light - value) * leak;
      source[i + channel] = (channel === 0 ? red : channel === 1 ? green : blue) + (Math.max(0, Math.min(255, value)) - (channel === 0 ? red : channel === 1 ? green : blue)) * amount;
    }
  }
  ctx.putImageData(image, 0, 0);
  // Only the last effect per source is cached, so repeated editing stays bounded.
  this.effectCache.set(photo, { key, canvas }); return canvas;
};
const renderWithFrames = Mochi.render;
Mochi.render = function (canvas) {
  if (!this.effects[this.options.filter]) return renderWithFrames.call(this, canvas);
  const model = { ...this, photos: this.photos.map(photo => this.processPhoto(photo, this.options.filter, this.options.intensity ?? 75)), options: { ...this.options, filter: "Original" } };
  return renderWithFrames.call(model, canvas);
};

// Pink heart crown, inspired by the supplied reference photo.
Mochi.effects["Pink Heart Crown"] = { group: "Glow", lift: 0.03, soft: 0.20, bloom: 0.06, contrast: 0.96, tint: [-4, -9, 20], sat: 0.94 };
Mochi.filters["Pink Heart Crown"] = "none";
Mochi.crownSettings = new WeakMap();
Mochi.crownDetections = new WeakMap();
Mochi.crownPosition = function (photo) {
  return this.crownSettings.get(photo) || this.crownDetections.get(photo) || null;
};
const processTonePhoto = Mochi.processPhoto;
Mochi.processPhoto = function (photo, name, strength, options) {
  const base = processTonePhoto.call(this, photo, name, strength, options);
  if (name !== "Pink Heart Crown" || Number(strength) <= 0) return base;
  const position = this.crownPosition(photo);
  if (!position) return base;
  const canvas = (options?.reuse && this.liveCrownBuffers.get(photo)) || document.createElement("canvas");
  if (options?.reuse) this.liveCrownBuffers.set(photo, canvas);
  if (canvas.width !== base.width || canvas.height !== base.height) { canvas.width = base.width; canvas.height = base.height; }
  const c = canvas.getContext("2d"); c.drawImage(base, 0, 0, canvas.width, canvas.height);
  const cx = position.x * canvas.width / 100, cy = position.y * canvas.height / 100, scale = position.size / 100 * (canvas.width / 600);
  c.save(); c.beginPath(); c.rect(0, 0, canvas.width, canvas.height); c.clip();
  c.translate(cx, cy); c.rotate(position.angle || 0);
  c.globalAlpha = Math.min(1, Math.max(0, Number(strength) / 100));
  const heart = (x, y, size, rotation, color) => {
    c.save(); c.translate(x, y); c.rotate(rotation); c.scale(size, size);
    c.shadowColor = "#E24C9D"; c.shadowBlur = 0.28;
    const gradient = c.createLinearGradient(-0.5, -0.6, 0.5, 0.7);
    gradient.addColorStop(0, "#FF99D1"); gradient.addColorStop(0.45, color); gradient.addColorStop(1, "#BD327B");
    c.fillStyle = gradient; c.beginPath(); c.moveTo(0, 0.65);
    c.bezierCurveTo(-1.2, -0.05, -0.65, -1.05, 0, -0.42);
    c.bezierCurveTo(0.65, -1.05, 1.2, -0.05, 0, 0.65); c.fill();
    c.shadowBlur = 0; c.strokeStyle = "#FFC5E5"; c.globalAlpha *= 0.65; c.lineWidth = 0.07;
    c.beginPath(); c.moveTo(-0.46, -0.32); c.quadraticCurveTo(-0.31, -0.55, -0.14, -0.38); c.stroke(); c.restore();
  };
  const sizes = [17, 21, 18, 24, 19, 23, 17, 20, 13];
  for (let i = 0; i < 9; i++) {
    const t = (i - 4) / 4;
    heart(t * 114 * scale, (t * t * 34 - 13) * scale, sizes[i] * scale, t * 0.38 + (i % 2 ? 0.10 : -0.12), i % 2 ? "#E8459B" : "#F05BAE");
  }
  heart(-92 * scale, -26 * scale, 9 * scale, -0.35, "#E778BD");
  heart(79 * scale, -25 * scale, 8 * scale, 0.3, "#F780C3");
  c.restore(); return canvas;
};
