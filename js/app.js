(() => {
  const $ = selector => document.querySelector(selector);
  let toastTimer, resultBlob = null, resultURL = null, exporting = false, exportGeneration = 0;
  Mochi.toast = message => { clearTimeout(toastTimer); $("#toast").textContent = message; $("#toast").classList.add("show"); toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3500); };
  const reviewPage = document.createElement("section"); reviewPage.id = "review"; reviewPage.className = "page";
  reviewPage.innerHTML = `<div class="page-title"><span class="eyebrow">02 / YOUR LITTLE MOMENTS</span><h2>Suka fotonya? Cek dulu, yuk ♡</h2><p>Setiap foto bisa diulang sendiri. Foto lainnya tetap tersimpan.</p></div><div class="review-workspace"><div class="review-main"><div class="review-photo-surface"><canvas id="review-photo" aria-label="Foto yang sedang diperiksa"></canvas></div><div class="review-navigation"><button id="review-prev" class="secondary" aria-label="Foto sebelumnya">←</button><span id="review-position" aria-live="polite"></span><button id="review-next" class="secondary" aria-label="Foto berikutnya">→</button></div><button id="review-retake" class="secondary">↶ Retake foto ini</button></div><aside class="panel"><span class="eyebrow">YOUR SESSION</span><h3>One moment at a time.</h3><p id="review-summary"></p><div id="review-list" class="review-list"></div><button id="review-continue" class="primary"></button><button id="review-restart" class="text-button">Ulang semua foto</button><small>Frame dan filter pilihanmu akan dipakai pada hasil akhir.</small></aside></div>`;
  $("main").append(reviewPage);
  Mochi.review = {
    index: 0,
    show() {
      if (!Mochi.photos.length) return;
      this.index = Math.max(0, Math.min(this.index, Mochi.photos.length - 1));
      const source = Mochi.photos[this.index], canvas = $("#review-photo"); canvas.width = source.width; canvas.height = source.height; const reviewContext = canvas.getContext("2d"); reviewContext.filter = Mochi.filters[Mochi.options.filter] || "none"; reviewContext.drawImage(Mochi.processPhoto(source, Mochi.options.filter, Mochi.options.intensity ?? 75), 0, 0, canvas.width, canvas.height); reviewContext.filter = "none";
      $("#review-position").textContent = `Foto ${this.index + 1} dari ${Mochi.camera.count}`;
      $("#review-prev").disabled = this.index === 0; $("#review-next").disabled = this.index === Mochi.photos.length - 1;
      $("#review-summary").textContent = `${Mochi.photos.length} dari ${Mochi.camera.count} foto sudah diambil`;
      $("#review-retake").textContent = `↶ Retake foto ${this.index + 1}`;
      $("#review-continue").textContent = Mochi.photos.length < Mochi.camera.count ? `Pakai foto · ambil foto ${Mochi.photos.length + 1} →` : "Semua cocok · lanjut edit →";
      const list = $("#review-list"); list.replaceChildren();
      for (let index = 0; index < Mochi.camera.count; index++) {
        const card = document.createElement("div"); card.className = "review-card";
        if (Mochi.photos[index]) {
          const view = document.createElement("button"); view.className = "review-thumb"; view.classList.toggle("selected", index === this.index); view.setAttribute("aria-label", `Lihat foto ${index + 1}`); view.setAttribute("aria-pressed", String(index === this.index));
          const thumb = document.createElement("canvas"); thumb.width = 120; thumb.height = Mochi.photoHeight(Mochi.photos[index], thumb.width); thumb.getContext("2d").drawImage(Mochi.photos[index], 0, 0, thumb.width, thumb.height); thumb.setAttribute("aria-hidden", "true");
          const title = document.createElement("span"); title.textContent = `Foto ${index + 1}`; view.append(thumb, title); view.onclick = () => { this.index = index; this.show(); };
          const retake = document.createElement("button"); retake.className = "text-button"; retake.textContent = "↶ Retake"; retake.setAttribute("aria-label", `Retake foto ${index + 1}`); retake.onclick = () => this.retake(index); card.append(view, retake);
        } else { const empty = document.createElement("div"); empty.className = "review-empty"; empty.textContent = `${index + 1} · Belum diambil`; card.append(empty); }
        list.append(card);
      }
    },
    retake(index) { if (!Mochi.photos[index]) return; Mochi.camera.stop(); Mochi.camera.retakeIndex = index; this.index = index; location.hash = "studio"; }
  };
  function cancelExport() {
    exportGeneration++;
    exporting = false;
    $("#finish").disabled = false;
  }
  function clearResult() { cancelExport(); if (resultURL) URL.revokeObjectURL(resultURL); resultURL = null; resultBlob = null; $("#result-image").removeAttribute("src"); }
  function restart() { Mochi.camera.stop(); Mochi.camera.retakeIndex = null; Mochi.photos = []; Mochi.review.index = 0; clearResult(); $("#thumbnails").replaceChildren(); $("#camera-error").textContent = ""; Mochi.camera.controls(); location.hash = "setup"; route(); }
  function route() {
    let page = location.hash.slice(1) || "home";
    if (!["home", "setup", "studio", "review", "editor", "result"].includes(page)) page = "home";
    if (["review", "editor", "result"].includes(page) && !Mochi.photos.length) page = "studio";
    if (["editor", "result"].includes(page) && Mochi.photos.length < Mochi.camera.count) page = "review";
    if (page === "result" && !resultBlob) page = "editor";
    if (page !== "studio") Mochi.camera.stop();
    if (page !== "result") clearResult();
    document.querySelectorAll(".page").forEach(element => element.classList.toggle("active", element.id === page));
    if (page === "review") { clearResult(); Mochi.review.show(); }
    if (page === "editor" || page === "setup") Mochi.editor.update();
    if (page === "studio") {
      const target = Number.isInteger(Mochi.camera.retakeIndex) ? Mochi.camera.retakeIndex : Mochi.photos.length;
      $("#capture").textContent = Number.isInteger(Mochi.camera.retakeIndex) ? `Ambil ulang foto ${target + 1} ♡` : `Ambil foto ${Math.min(target + 1, Mochi.camera.count)} ♡`;
      $("#progress").textContent = `Foto ${Math.min(target + 1, Mochi.camera.count)} dari ${Mochi.camera.count} · Mulai kamera saat siap`;
      $("#studio-back-review").hidden = !Mochi.photos.length; Mochi.camera.controls();
    }
    window.scrollTo(0, 0);
  }
  const controlsBeforeReview = Mochi.camera.controls;
  Mochi.camera.controls = function () { controlsBeforeReview.call(this); if (Mochi.photos.length) document.querySelectorAll("#counts button").forEach(button => button.disabled = true); };
  const backReview = document.createElement("button"); backReview.id = "studio-back-review"; backReview.className = "secondary"; backReview.textContent = "← Kembali ke review"; backReview.hidden = true; $("#reset-session").before(backReview);
  backReview.onclick = () => { Mochi.camera.stop(); Mochi.camera.retakeIndex = null; location.hash = "review"; };
  $("#review-prev").onclick = () => { Mochi.review.index--; Mochi.review.show(); };
  $("#review-next").onclick = () => { Mochi.review.index++; Mochi.review.show(); };
  $("#review-retake").onclick = () => Mochi.review.retake(Mochi.review.index);
  $("#review-restart").onclick = restart;
  $("#review-continue").onclick = () => { Mochi.camera.retakeIndex = null; location.hash = Mochi.photos.length < Mochi.camera.count ? "studio" : "editor"; };
  const editReview = document.createElement("button"); editReview.className = "secondary"; editReview.textContent = "← Review / retake per foto"; editReview.onclick = () => location.hash = "review"; $("#editor-retake").before(editReview);
  $("#studio .session-tip p").textContent = "Satu foto per klik dengan countdown 3 detik. Kamera tetap menyala; ganti pose lalu tekan ambil foto berikutnya.";
  $("#editor .eyebrow").textContent = "03 / MAKE IT YOURS"; $("#result .eyebrow").textContent = "04 / IT IS A KEEPER";
  $("#start").onclick = restart;
  $("#how").onclick = () => { location.hash = "home"; requestAnimationFrame(() => $("#steps").scrollIntoView({ behavior: "smooth" })); };
  try { document.body.classList.toggle("lavender", localStorage.getItem("mochi-theme") === "lavender"); } catch {}
  $("#theme").onclick = () => { const lavender = document.body.classList.toggle("lavender"); try { localStorage.setItem("mochi-theme", lavender ? "lavender" : "cream"); } catch {} $("#theme").setAttribute("aria-pressed", String(lavender)); };
  $("#camera-start").onclick = () => Mochi.camera.start(); $("#capture").onclick = () => Mochi.camera.capture();
  $("#switch").onclick = () => { Mochi.camera.facing = Mochi.camera.facing === "user" ? "environment" : "user"; Mochi.camera.start(); };
  document.querySelectorAll("#counts button").forEach(button => button.onclick = () => { Mochi.camera.count = Number(button.dataset.count); Mochi.editor.select(button); route(); });
  ["#reset-session", "#editor-retake", "#result-retake"].forEach(selector => { $(selector).onclick = restart; $(selector).textContent = "Ulang semua foto"; });
  $("#finish").onclick = async () => {
    if (exporting || Mochi.photos.length !== Mochi.camera.count) return;
    clearResult();
    const token = exportGeneration;
    const photos = Mochi.photos.slice();
    const options = JSON.stringify(Mochi.options);
    const current = () => token === exportGeneration &&
      photos.length === Mochi.camera.count && photos.length === Mochi.photos.length &&
      photos.every((photo, index) => photo === Mochi.photos[index]) &&
      options === JSON.stringify(Mochi.options);
    exporting = true; $("#finish").disabled = true;
    try {
      await document.fonts.ready;
      if (!current()) return;
      const canvas = document.createElement("canvas");
      Mochi.render(canvas);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      if (!current()) return;
      if (!blob) throw new Error("PNG encoding failed");
      resultBlob = blob; resultURL = URL.createObjectURL(blob);
      $("#result-image").src = resultURL;
      const file = new File([blob], "mochibooth.png", { type: "image/png" });
      $("#share").hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
      location.hash = "result";
    } catch {
      if (current()) Mochi.toast("Could not create your PNG. Please try again.");
    } finally {
      if (token === exportGeneration) { exporting = false; $("#finish").disabled = false; }
    }
  };
  $("#download").onclick = () => { if (!resultURL) return; const a = document.createElement("a"); a.href = resultURL; a.download = `mochibooth-${new Date().toISOString().slice(0, 10)}.png`; a.click(); Mochi.toast("A little memory, saved ♡"); };
  $("#share").onclick = async () => { if (!resultBlob) return; try { await navigator.share({ files: [new File([resultBlob], "mochibooth.png", { type: "image/png" })], title: "My MochiBooth moments" }); } catch (error) { if (error.name !== "AbortError") Mochi.toast("Sharing is unavailable. Download your PNG to share it."); } };
  $("#back-editor").onclick = () => location.hash = "editor";
  window.addEventListener("hashchange", route); window.addEventListener("pagehide", event => {
    Mochi.camera.stop();
    if (event.persisted) cancelExport(); else clearResult();
  });
  window.addEventListener("pageshow", event => { if (event.persisted) route(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { Mochi.camera.stop(); $("#progress").textContent = "Session paused. Start the camera to try again."; } });
  const style = document.createElement("style"); style.textContent = `.review-workspace{max-width:1020px;margin:auto;padding:0 24px;display:grid;grid-template-columns:minmax(0,1.65fr) minmax(270px,1fr);gap:28px}.review-main{display:flex;flex-direction:column;gap:16px}.review-photo-surface{padding:16px;background:#eee6e1;border-radius:16px;display:flex;justify-content:center}#review-photo{display:block;width:100%;height:auto;max-height:65vh;object-fit:contain;border-radius:8px}.review-navigation{display:flex;align-items:center;justify-content:space-between;font-size:12px}.review-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.review-card{text-align:center;min-width:0}.review-thumb{padding:5px;border:1px solid var(--line);border-radius:8px;background:var(--bg);width:100%;color:var(--ink)}.review-thumb canvas{width:100%;height:auto;display:block;border-radius:4px}.review-thumb span{display:block;padding:7px;font-size:11px}.review-card .text-button{font-size:11px}.review-empty{min-height:80px;display:grid;place-items:center;font-size:10px;color:var(--muted);border:1px dashed var(--line);border-radius:8px}#review-summary{margin:0;color:var(--muted);font-size:12px}@media(max-width:760px){.review-workspace{grid-template-columns:1fr;padding:0 16px}.review-list{grid-template-columns:repeat(3,minmax(0,1fr))}#review-photo{max-height:52vh}.review-workspace .panel{gap:12px}}`; document.head.append(style);
  Mochi.editor.init();
  const setup = document.createElement("section"); setup.id = "setup"; setup.className = "page";
  setup.innerHTML = '<div class="page-title"><span class="eyebrow">01 / PILIH GAYAMU</span><h2>Frame & filter sesukamu ♡</h2><p>Pilih dulu sebelum foto. Pilihanmu tetap dipakai sampai hasil akhir.</p></div><div class="setup-grid"><div class="setup-preview"><canvas id="setup-preview" aria-label="Contoh frame dan filter pilihanmu"></canvas><small>Ilustrasi hasil · foto aslimu akan mengisi frame ini</small><button id="setup-go" class="primary">Lanjut ke kamera →</button></div><div class="panel" id="setup-options"></div></div>';
  $("main").append(setup);
  const setupOptions = $("#setup-options"), gallery = $("#colors"), filters = $("#filters");
  setupOptions.append(gallery.previousElementSibling.previousElementSibling, gallery.previousElementSibling, gallery, gallery.nextElementSibling);
  setupOptions.append(filters.previousElementSibling, filters, $(".effect-strength"));
  $("#setup-go").onclick = () => { location.hash = "studio"; };
  for (const target of [$("#studio .camera-shell"), $("#editor .editor-panel")]) {
    const change = document.createElement("button"); change.className = "text-button"; change.textContent = "✧ Ganti frame & filter"; change.onclick = () => { location.hash = "setup"; }; target.append(change);
  }
  const sample = document.createElement("canvas"); sample.width = 600; sample.height = 450;
  const sampleContext = sample.getContext("2d"); sampleContext.fillStyle = "#d8ccc4"; sampleContext.fillRect(0,0,600,450); sampleContext.fillStyle = "#f3e9dd"; sampleContext.beginPath(); sampleContext.arc(300,160,70,0,Math.PI*2); sampleContext.fill(); sampleContext.beginPath(); sampleContext.ellipse(300,430,155,165,0,0,Math.PI*2); sampleContext.fill();
  const updateBeforeSetup = Mochi.editor.update;
  Mochi.editor.update = function () { clearResult(); updateBeforeSetup.call(this); Mochi.render.call({...Mochi, photos: Array(Mochi.camera.count).fill(sample), options: {...Mochi.options}}, $("#setup-preview")); };
  Mochi.editor.update(); route(); document.fonts.ready.then(() => Mochi.editor.update());
  Mochi.camera.updateCaptureLabel();
})();
