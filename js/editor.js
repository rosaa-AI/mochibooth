/* Frame gallery: miniature canvases use the same renderer as the final PNG. */
Mochi.editor = {
  update() { if (Mochi.photos.length) Mochi.render(document.querySelector("#preview")); },
  init() {
    const gallery = document.querySelector("#colors");
    gallery.className = "frame-gallery";
    gallery.previousElementSibling.textContent = "Choose your frame · 20 designs";
    const categories = document.createElement("div"); categories.className = "frame-categories choices";
    categories.setAttribute("aria-label", "Frame categories");
    gallery.before(categories);
    const selectedName = document.createElement("p"); selectedName.className = "frame-current";
    gallery.after(selectedName);
    const style = document.createElement("style");
    style.textContent = `.frame-gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;max-height:430px;overflow-y:auto;padding:5px;scrollbar-width:thin}.frame-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 4px 8px;border:1px solid var(--line);background:var(--bg);border-radius:10px;color:var(--ink);min-width:0}.frame-card.selected{outline:2px solid var(--accent);outline-offset:0}.frame-card canvas{height:100px;width:auto;max-width:100%;box-shadow:0 3px 7px #58413c22}.frame-card span{font-size:10px;line-height:1.3;text-align:center}.frame-categories{gap:5px}.frame-categories button{font-size:10px;padding:6px 9px}.frame-current{margin:0;font-size:11px;color:var(--accent)}@media(max-width:760px){.frame-gallery{grid-template-columns:repeat(4,minmax(0,1fr));max-height:360px}}@media(max-width:380px){.frame-gallery{grid-template-columns:repeat(3,minmax(0,1fr))}}`;
    document.head.append(style);
    const sample = document.createElement("canvas"); sample.width = 600; sample.height = 450;
    const sc = sample.getContext("2d");
    sc.fillStyle = "#D8CCC4"; sc.fillRect(0, 0, 600, 450);
    sc.fillStyle = "#F3E9DD"; sc.beginPath(); sc.arc(300, 170, 74, 0, Math.PI * 2); sc.fill();
    sc.beginPath(); sc.ellipse(300, 425, 155, 150, 0, 0, Math.PI * 2); sc.fill();
    const entries = Object.entries(Mochi.frames);
    for (const category of ["All", ...new Set(entries.map(([, f]) => f.group))]) {
      const button = document.createElement("button"); button.textContent = category;
      button.classList.toggle("selected", category === "All"); button.setAttribute("aria-pressed", String(category === "All"));
      button.onclick = () => { this.select(button); gallery.querySelectorAll("button").forEach(card => card.hidden = category !== "All" && card.dataset.category !== category); };
      categories.append(button);
    }
    for (const [key, frame] of entries) {
      const button = document.createElement("button"); button.className = "frame-card"; button.dataset.category = frame.group;
      button.setAttribute("aria-label", `${frame.name} frame`); button.setAttribute("aria-pressed", String(key === Mochi.options.frame)); button.classList.toggle("selected", key === Mochi.options.frame);
      const full = document.createElement("canvas");
      // Render a separate model, preserving the actual session and selected options.
      Mochi.render.call({ ...Mochi, photos: Array(4).fill(sample), options: { ...Mochi.options, frame: key, filter: "Original", layout: "strip", caption: "", date: false, decoration: "none" } }, full);
      const thumb = document.createElement("canvas"); thumb.width = 84; thumb.height = Math.round(full.height * 84 / full.width);
      thumb.getContext("2d").drawImage(full, 0, 0, thumb.width, thumb.height); thumb.setAttribute("aria-hidden", "true");
      full.width = full.height = 0;
      const label = document.createElement("span"); label.textContent = frame.name; button.append(thumb, label);
      button.onclick = () => { Mochi.options.frame = key; this.select(button); selectedName.textContent = `Selected: ${frame.name}`; this.update(); };
      gallery.append(button);
    }
    selectedName.textContent = `Selected: ${Mochi.frames[Mochi.options.frame].name}`;
    Object.keys(Mochi.filters).forEach(name => {
      const button = document.createElement("button"); button.textContent = name; button.classList.toggle("selected", name === Mochi.options.filter); button.setAttribute("aria-pressed", String(name === Mochi.options.filter));
      button.onclick = () => { Mochi.options.filter = name; this.select(button); this.update(); }; document.querySelector("#filters").append(button);
    });
    document.querySelector("#caption").oninput = e => { Mochi.options.caption = e.target.value; this.update(); };
    document.querySelector("#date").onchange = e => { Mochi.options.date = e.target.checked; this.update(); };
    for (const [id, key] of [["decorations", "decoration"], ["layouts", "layout"]]) {
      document.querySelectorAll(`#${id} button`).forEach(button => button.onclick = () => { Mochi.options[key] = button.dataset[key]; this.select(button); this.update(); });
    }
  },
  select(button) { Array.from(button.parentElement.children).forEach(item => { item.classList.toggle("selected", item === button); item.setAttribute("aria-pressed", String(item === button)); }); }
};



const initializeFrameGallery = Mochi.editor.init;
Mochi.editor.init = function () {
  initializeFrameGallery.call(this);
  const filters = document.querySelector("#filters");
  filters.previousElementSibling.textContent = "Find your photo mood";
  filters.replaceChildren();
  filters.className = "filter-collection";
  const descriptions = { Glow: "Soft skin tones, luminous highlights. Your face stays yours.", Analog: "Original film & CCD-inspired looks: grain, vignette, light leaks.", Classic: "The everyday essentials." };
  for (const group of ["Glow", "Analog", "Classic"]) {
    const section = document.createElement("section"); section.className = "filter-group";
    const heading = document.createElement("h4"); heading.textContent = group === "Glow" ? "✧ Glow studio" : group === "Analog" ? "◎ Analog camera club" : "The classics";
    const note = document.createElement("p"); note.textContent = descriptions[group];
    const choices = document.createElement("div"); choices.className = "choices filter-options";
    for (const name of Object.keys(Mochi.filters).filter(name => (Mochi.effects[name]?.group || "Classic") === group)) {
      const b = document.createElement("button"); b.textContent = name; b.dataset.filter = name;
      b.classList.toggle("selected", name === Mochi.options.filter); b.setAttribute("aria-pressed", String(name === Mochi.options.filter));
      b.onclick = () => {
        Mochi.options.filter = name;
        filters.querySelectorAll("button").forEach(button => { const active = button === b; button.classList.toggle("selected", active); button.setAttribute("aria-pressed", String(active)); });
        sync(); this.update();
      };
      choices.append(b);
    }
    section.append(heading, note, choices); filters.append(section);
  }
  const controls = document.createElement("div"); controls.className = "effect-strength";
  const label = document.createElement("label"); label.htmlFor = "effect-intensity"; label.textContent = "Filter intensity";
  const output = document.createElement("output"); output.htmlFor = "effect-intensity";
  const range = document.createElement("input"); range.type = "range"; range.id = "effect-intensity"; range.min = "0"; range.max = "100"; range.step = "5"; range.value = String(Mochi.options.intensity);
  const help = document.createElement("small");
  let scheduled = 0;
  range.oninput = () => { Mochi.options.intensity = Number(range.value); output.textContent = `${range.value}%`; cancelAnimationFrame(scheduled); scheduled = requestAnimationFrame(() => this.update()); };
  const sync = this.syncFilterControls = () => {
    const supported = !!Mochi.effects[Mochi.options.filter]; range.disabled = !supported;
    output.textContent = supported ? `${range.value}%` : "Preset";
    help.textContent = supported ? "0% = original · 100% = full effect. Saved in your PNG." : "Choose a Glow or Analog look to adjust intensity.";
  };
  controls.append(label, output, range, help); filters.after(controls); sync();
  const styles = document.createElement("style");
  styles.textContent = `.filter-collection{display:flex;flex-direction:column;gap:17px}.filter-group h4{font:600 14px Quicksand,sans-serif;margin:0 0 5px}.filter-group p{font-size:10px;color:var(--muted);line-height:1.6;margin:0 0 9px}.filter-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.filter-options button{padding:11px 6px;text-align:center;font-size:10px}.effect-strength{display:grid;grid-template-columns:1fr auto;gap:10px;background:var(--bg);padding:15px;border:1px solid var(--line);border-radius:9px}.effect-strength output{font-size:11px;color:var(--accent)}.effect-strength input,.effect-strength small{grid-column:1/-1}.effect-strength input{width:100%;accent-color:var(--accent);cursor:pointer}.effect-strength input:disabled{opacity:.4;cursor:default}.effect-strength small{font-size:10px;line-height:1.6;color:var(--muted)}`;
  document.head.append(styles);
};

const initWithoutCrownControls = Mochi.editor.init;
const updateWithoutCrownControls = Mochi.editor.update;
Mochi.editor.init = function () {
  initWithoutCrownControls.call(this);
  const panel = document.createElement("section"); panel.id = "crown-controls"; panel.className = "panel crown-controls"; panel.hidden = true;
  const heading = document.createElement("h4"); heading.textContent = "♥ Pink Heart Crown";
  const help = document.createElement("p"); help.textContent = "Mahkota otomatis mengikuti posisi, ukuran, dan kemiringan wajah. Penyesuaian manual per foto tetap tersedia jika diperlukan.";
  const label = document.createElement("label"); label.htmlFor = "crown-photo"; label.textContent = "Adjust photo";
  const select = document.createElement("select"); select.id = "crown-photo";
  panel.append(heading, help, label, select);
  const inputs = {};
  for (const [key, title, min, max] of [["x", "Left / right", 5, 95], ["y", "Height", 5, 85], ["size", "Crown size", 35, 180]]) {
    const row = document.createElement("label"); row.htmlFor = `crown-${key}`; row.textContent = title;
    const output = document.createElement("output"); const slider = document.createElement("input"); slider.id = `crown-${key}`; slider.type = "range"; slider.min = min; slider.max = max; slider.step = 1;
    inputs[key] = { slider, output }; row.append(output); panel.append(row, slider);
    slider.oninput = () => {
      const photo = Mochi.photos[Number(select.value)]; if (!photo) return;
      Mochi.crownSettings.set(photo, { ...(Mochi.crownPosition(photo) || { x: 50, y: 16, size: 100, angle: 0 }), [key]: Number(slider.value) }); this.update();
    };
  }
  const reset = document.createElement("button"); reset.className = "secondary"; reset.textContent = "Reset this crown";
  reset.onclick = () => { const photo = Mochi.photos[Number(select.value)]; if (photo) Mochi.crownSettings.delete(photo); this.update(); }; panel.append(reset);
  document.querySelector(".effect-strength").after(panel);
  let lastPhotos = [];
  this.syncCrownControls = () => {
    panel.hidden = Mochi.options.filter !== "Pink Heart Crown";
    if (panel.hidden) return;
    if (lastPhotos.length !== Mochi.photos.length || lastPhotos.some((photo, index) => photo !== Mochi.photos[index])) {
      const selected = select.value;
      lastPhotos = Mochi.photos.slice(); select.replaceChildren();
      Mochi.photos.forEach((photo, index) => { const option = document.createElement("option"); option.value = index; option.textContent = `Photo ${index + 1}`; select.append(option); Mochi.detectCrown(photo); });
      if (selected !== "" && Number(selected) < Mochi.photos.length) select.value = selected;
    }
    const photo = Mochi.photos[Number(select.value)]; if (!photo) return;
    const position = Mochi.crownPosition(photo);
    if (!position) return;
    for (const [key, controls] of Object.entries(inputs)) { controls.slider.value = Math.round(position[key]); controls.output.textContent = ` ${Math.round(position[key])}%`; }
  };
  select.onchange = () => this.syncCrownControls();
  const style = document.createElement("style"); style.textContent = `.crown-controls{padding:16px;background:#fff0f6;gap:10px}.crown-controls h4{margin:0;color:#A74879}.crown-controls p{font-size:11px;line-height:1.6;color:var(--muted);margin:0}.crown-controls label{display:flex;justify-content:space-between}.crown-controls output{color:var(--accent)}.crown-controls input{width:100%;accent-color:#D85B9D}.crown-controls select{padding:9px;border:1px solid var(--line);border-radius:7px;background:white;color:var(--ink);font:inherit}`; document.head.append(style);
};
Mochi.editor.update = function () {
  this.syncFilterControls?.();
  updateWithoutCrownControls.call(this); this.syncCrownControls?.();
};
