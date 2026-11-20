Mochi.camera = {
  stream: null,
  facing: "user",
  aspectRatio: null,
  count: 4,
  sessionMode: "auto",
  busy: false,
  generation: 0,
  starting: false,
  stop() {
    const shutter = document.querySelector("#shutter-light"); if (shutter) shutter.hidden = true;
    this.generation++;
    Mochi.resetLiveCrown?.();
    this.busy = false;
    this.starting = false;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    document.querySelector("#camera-start").textContent = "Start Camera ◎";
    document.querySelector("#video").srcObject = null;
    document.querySelector("#countdown").textContent = "";
    this.controls();
  },
  controls() {
    const ready = !!this.stream;
    document.querySelector("#capture").disabled = !ready || this.busy;
    document.querySelector("#camera-start").disabled = ready || this.starting;
    document.querySelector("#switch").disabled = !ready || this.busy;
    document
      .querySelectorAll("#counts button")
      .forEach((b) => (b.disabled = this.busy));
    document.querySelector("#camera-empty").hidden = ready;
  },
  async start() {
    if (this.starting || this.busy) return;
    this.stop();
    const token = this.generation;
    this.aspectRatio = this.getAspectRatio();
    this.starting = true;
    this.controls();
    const btn = document.querySelector("#camera-start");
    btn.textContent = "Opening camera…";
    document.querySelector("#camera-error").textContent = "";
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw Object.assign(new Error(), { name: "InsecureContext" });
      const supported = navigator.mediaDevices.getSupportedConstraints?.() || {};
      const constraints = { facingMode: { ideal: this.facing } };
      if (supported.resizeMode) constraints.resizeMode = "none";
      if (supported.zoom) constraints.zoom = { ideal: 1 };
      if (supported.frameRate) constraints.frameRate = { ideal: 30 };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: constraints });
      if (token !== this.generation) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      await this.resetZoom(stream);
      if (token !== this.generation) return;
      const video = document.querySelector("#video");
      video.srcObject = stream;
      await video.play();
      if (token !== this.generation) return;
      this.stream.getVideoTracks()[0].addEventListener("ended", () => {
        if (this.stream === stream) {
          this.stop();
          document.querySelector("#camera-error").textContent =
            "Camera disconnected. Reconnect it, then start the camera again.";
        }
      });
      document.querySelector("#progress").textContent =
        "Camera ready. Find your favorite pose ♡";
    } catch (e) {
      if (token !== this.generation) return;
      this.stop();
      const errors = {
        NotAllowedError:
          "Camera permission was denied. Allow camera access in your browser settings, then try again.",
        NotFoundError: "No camera was found. Connect a camera and try again.",
        NotReadableError:
          "The camera is unavailable or used by another app. Close that app and try again.",
        InsecureContext:
          "Open this website on HTTPS or localhost to use your camera.",
      };
      document.querySelector("#camera-error").textContent =
        errors[e.name] ||
        "Unable to start the camera. Check your camera connection and browser permissions.";
    } finally {
      if (token === this.generation) {
        this.starting = false;
        btn.textContent = "Start Camera ◎";
        this.controls();
      }
    }
  },
  async capture() {
    if (this.busy || !this.stream) return;
    const retake = Number.isInteger(this.retakeIndex);
    const first = retake ? this.retakeIndex : Mochi.photos.length;
    if (first < 0 || first >= this.count) return;
    const last = retake || this.sessionMode === "manual" ? first + 1 : this.count;
    this.busy = true; this.controls(); const token = this.generation;
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const shutter = document.querySelector('#shutter-light');
    try {
      for (let target = first; target < last; target++) {
        for (let n = 3; n > 0; n--) {
          if (token !== this.generation) return;
          document.querySelector('#countdown').textContent = n;
          document.querySelector('#progress').textContent = 'Foto ' + (target + 1) + ' dari ' + this.count + ' — siap berpose!';
          await wait(1000);
        }
        if (token !== this.generation) return;
        document.querySelector('#countdown').textContent = '';
        const video = document.querySelector('#video');
        if (!video.videoWidth || video.readyState < 2) throw new Error('Camera not ready');
        const shot = document.createElement('canvas'); shot.width = 1200; shot.height = Math.round(shot.width / this.getAspectRatio());
          const flashMode = await Mochi.lighting.on(this, token);
        if (token !== this.generation) return;
        if (shutter && flashMode !== 'off') { shutter.hidden = false; await wait(110); }
        if (token !== this.generation) return;
        // Match the orientation and crop shown in the live preview.
        this.drawFrame(video, shot); Mochi.photos[target] = shot;
        if (Mochi.options.filter === "Pink Heart Crown") { Mochi.freezeCrown?.(shot); void Mochi.detectCrown(shot); }
        const thumbs = document.querySelector('#thumbnails'); thumbs.replaceChildren();
        Mochi.photos.forEach((photo,index)=>{const image=new Image();image.src=photo.toDataURL('image/jpeg',.7);image.alt='Foto '+(index+1);thumbs.append(image);});
        await wait(190); if (token !== this.generation) return;
        await Mochi.lighting.off();
        if (token !== this.generation) return;
        if (target + 1 < last) { document.querySelector('#progress').textContent = 'Ganti pose — foto berikutnya segera!'; await wait(700); }
      }
      if (token !== this.generation) return;
      this.retakeIndex = null; Mochi.review.index = last - 1;
      if (retake || Mochi.photos.length >= this.count) {
        this.stop(); location.hash = 'review';
        Mochi.toast(retake ? 'Foto ulang siap dicek ♡' : 'Semua foto selesai! Pilih hasil favoritmu ♡');
      } else {
        document.querySelector('#capture').textContent = 'Ambil foto ' + (last + 1) + ' ♡';
        document.querySelector('#progress').textContent = last + ' dari ' + this.count + ' selesai · Ganti pose, lalu tekan ambil foto';
        const review = document.querySelector('#studio-back-review'); if(review) review.hidden = false;
        Mochi.toast('Foto tersimpan. Siap-siap untuk pose berikutnya ♡');
      }
    } catch {
      if (token !== this.generation) return;
      this.stop(); document.querySelector('#camera-error').textContent = 'Pengambilan terhenti. Foto yang sudah diambil tetap tersimpan. Mulai kamera untuk melanjutkan.';
    } finally {
      if (token === this.generation) { await Mochi.lighting.off(); if (token === this.generation) { this.busy = false; this.controls(); } }
    }
  },
};

// Pulse the screen or supported rear-camera lamp only around each shutter release.
Mochi.lighting = {
  mode: "auto", lamp: null, status: null,
  async off() {
    const shutter = document.querySelector("#shutter-light"); if (shutter) shutter.hidden = true;
    const track = this.lamp; this.lamp = null;
    if (track?.readyState === "live") {
      try { await track.applyConstraints({ ...track.getConstraints?.(), advanced: [{ torch: false }] }); } catch {}
    }
  },
  async on(camera, token) {
    if (this.mode === "off") return "off";
    const stream = camera.stream, track = stream?.getVideoTracks()[0];
    const current = () => token === camera.generation && stream === camera.stream;
    if (!current()) return "cancelled";
    if (this.mode === "auto" && !camera.isSelfieCamera()) {
      let hasTorch = false; try { hasTorch = !!track?.getCapabilities?.().torch; } catch {}
      if (hasTorch) {
        this.lamp = track;
        try {
          await track.applyConstraints({ ...track.getConstraints?.(), advanced: [{ torch: true }] });
          if (!current()) {
            try { await track.applyConstraints({ ...track.getConstraints?.(), advanced: [{ torch: false }] }); } catch {}
            if (this.lamp === track) this.lamp = null;
            return "cancelled";
          }
          if (track.getSettings?.().torch !== false) { this.status.textContent = "Kilatan lampu kamera"; return "torch"; }
        } catch {}
        if (!current()) return "cancelled";
        await this.off();
      }
    }
    if (!current()) return "cancelled";
    this.status.textContent = "Kilatan flash layar";
    return "screen";
  }
};
(() => {
  const light = Mochi.lighting;
  const control = document.createElement("div"); control.className = "flash-settings";
  const label = document.createElement("label"); label.htmlFor = "lighting-mode"; label.textContent = "⚡ Flash";
  const select = document.createElement("select"); select.id = "lighting-mode";
  for (const [value, name] of [["auto", "Otomatis · lampu / layar"], ["screen", "Kilatan layar"], ["off", "Mati"]]) { const option = document.createElement("option"); option.value = value; option.textContent = name; select.append(option); }
  select.onchange = () => { light.mode = select.value; };
  const note = document.createElement("small"); note.textContent = "Flash berkedip saat setiap foto dijepret. Kamera depan memakai kilatan layar; naikkan kecerahan HP untuk membantu menerangi wajah. Kamera belakang mencoba lampu jika didukung.";
  light.status = document.createElement("small"); light.status.id = "lighting-status"; light.status.setAttribute("role", "status");
  const readyText = "Flash menyala singkat saat dijepret."; light.status.textContent = readyText;
  control.append(label, select, note, light.status); document.querySelector("#reset-session").before(control);
  const shutter = document.createElement("div"); shutter.id = "shutter-light"; shutter.hidden = true; shutter.setAttribute("aria-hidden", "true"); document.body.append(shutter);
  const style = document.createElement("style");
  style.textContent = '.flash-settings{display:flex;flex-direction:column;gap:9px;padding:15px;border:1px solid var(--line);border-radius:10px;background:var(--bg)}.flash-settings label{font-weight:600;font-size:12px}.flash-settings select{width:100%;font:inherit;background:white;border:1px solid var(--line);border-radius:7px;padding:10px;color:var(--ink)}.flash-settings small{line-height:1.6}#shutter-light{position:fixed;inset:0;background:#fff;z-index:2000;pointer-events:none;animation:mochi-flash 300ms ease-out both}#shutter-light[hidden]{display:none}@keyframes mochi-flash{0%,45%{opacity:1}100%{opacity:0}}';
  document.head.append(style);
  const camera = Mochi.camera, stopCamera = camera.stop, updateControls = camera.controls;
  camera.controls = function () { updateControls.call(this); select.disabled = this.busy || this.starting; };
  camera.stop = function () { void light.off(); stopCamera.call(this); light.status.textContent = readyText; };
})();

// Front cameras use the familiar selfie view; saved photos match this preview.
Mochi.camera.resetZoom = async function (stream) {
  const track = stream.getVideoTracks()[0];
  try {
    const zoom = track.getCapabilities?.().zoom;
    if (Number.isFinite(zoom?.min) && zoom.min > 0 && track.applyConstraints) {
      await track.applyConstraints({ ...track.getConstraints?.(), zoom: zoom.min });
    }
  } catch { /* Cameras without zoom control still display the full incoming frame. */ }
};
Mochi.camera.getAspectRatio = function () {
  const photo = Mochi.photos[0];
  if (photo?.width && photo?.height) return photo.width / photo.height;
  if (this.stream && this.aspectRatio) return this.aspectRatio;
  return globalThis.matchMedia?.("(max-width: 760px)")?.matches ? 3 / 4 : 4 / 3;
};
Mochi.camera.isSelfieCamera = function () {
  let facing;
  try { facing = this.stream?.getVideoTracks()[0]?.getSettings?.().facingMode; } catch {}
  return facing ? facing === "user" : this.facing === "user";
};
Mochi.camera.shouldMirror = function () { return this.isSelfieCamera(); };
Mochi.camera.syncOrientation = function () {
  const video = document.querySelector("#video");
  const view = document.querySelector("#studio .camera-view");
  if (view) view.style.aspectRatio = String(this.getAspectRatio());
  const transform = this.shouldMirror() ? "scaleX(-1)" : "none";
  video.style.transform = transform;
  // Filter canvases already contain oriented pixels from drawFrame; never flip them twice.
  const live = document.querySelector("#live-filter");
  if (live) live.style.transform = "none";
};
Mochi.camera.drawFrame = function (video, canvas) {
  const width = video.videoWidth || video.width, height = video.videoHeight || video.height;
  if (!width || !height) return;
  const scale = Math.min(canvas.width / width, canvas.height / height);
  const drawWidth = width * scale, drawHeight = height * scale;
  const x = (canvas.width - drawWidth) / 2, y = (canvas.height - drawHeight) / 2;
  const context = canvas.getContext("2d"); context.save();
  context.fillStyle = "#eee6e1"; context.fillRect(0, 0, canvas.width, canvas.height);
  if (this.shouldMirror()) { context.translate(canvas.width, 0); context.scale(-1, 1); }
  context.drawImage(video, 0, 0, width, height, x, y, drawWidth, drawHeight);
  context.restore();
};
(() => {
  const controlsBeforeOrientation = Mochi.camera.controls;
  Mochi.camera.controls = function () {
    controlsBeforeOrientation.call(this); this.syncOrientation();
  };
  const video = document.querySelector("#video");
  for (const event of ["loadedmetadata", "resize"]) {
    video.addEventListener(event, () => Mochi.camera.syncOrientation());
  }
  globalThis.addEventListener?.("resize", () => Mochi.camera.syncOrientation());
  Mochi.camera.syncOrientation();
})();

// Keep the native video fluid; process effect previews at a smaller, reusable size.
(() => {
  const camera = Mochi.camera, video = document.querySelector("#video");
  const live = document.createElement("canvas"); live.id = "live-filter"; live.hidden = true;
  live.setAttribute("aria-label", "Preview kamera dengan filter"); video.after(live);
  const raw = document.createElement("canvas"); camera.liveSource = raw;
  const mobile = globalThis.matchMedia?.("(max-width: 760px)")?.matches;
  let previewWidth = mobile ? 240 : 320;
  raw.width = live.width = previewWidth;
  raw.height = live.height = Math.round(previewWidth / camera.getAspectRatio());
  const choice = document.createElement("select"); choice.id = "live-filter-choice"; choice.setAttribute("aria-label", "Filter kamera");
  for (const name of Object.keys(Mochi.filters)) { const option = document.createElement("option"); option.value = name; option.textContent = name; choice.append(option); }
  const label = document.createElement("label"); label.className = "live-filter-choice"; label.textContent = "Filter kamera "; label.append(choice); document.querySelector(".camera-actions").after(label);
  choice.onchange = () => {
    Mochi.options.filter = choice.value;
    document.querySelectorAll("#filters [data-filter]").forEach(button => { const active = button.dataset.filter === choice.value; button.classList.toggle("selected", active); button.setAttribute("aria-pressed", String(active)); });
    Mochi.editor.update(); last = -Infinity;
  };
  const crownStatus = document.createElement("p"); crownStatus.id = "crown-tracking-status"; crownStatus.className = "crown-tracking-status"; crownStatus.hidden = true; crownStatus.setAttribute("role", "status"); label.after(crownStatus);
  const metrics = camera.previewMetrics = {frames: 0, width: previewWidth, lastCost: 0, native: true};
  let callback = 0, callbackType = "animation", last = -Infinity, wasCrown = false, slowFrames = 0;
  function schedule() {
    if (!camera.stream) return;
    if (typeof video.requestVideoFrameCallback === "function") { callbackType = "video"; callback = video.requestVideoFrameCallback(paint); }
    else { callbackType = "animation"; callback = requestAnimationFrame(paint); }
  }
  function cancel() {
    if (callbackType === "video" && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(callback);
    else cancelAnimationFrame(callback);
    callback = 0;
  }
  function nativeView() {
    live.hidden = true; video.style.visibility = ""; video.style.filter = Mochi.filters[Mochi.options.filter] || "none"; metrics.native = true;
  }
  function paint(time) {
    callback = 0; if (!camera.stream) return;
    try {
      const filter = Mochi.options.filter, crown = filter === "Pink Heart Crown";
      if (wasCrown && !crown) { wasCrown = false; Mochi.resetLiveCrown?.(); }
      crownStatus.hidden = !crown;
      if (!Mochi.effects?.[filter] || Number(Mochi.options.intensity ?? 75) === 0) { nativeView(); return; }
      if (time - last < 1000 / 30 - 1 || video.readyState < 2 || !video.videoWidth) return;
      last = time;
      const startTime = performance.now(), height = Math.round(previewWidth / camera.getAspectRatio());
      if (raw.width !== previewWidth || raw.height !== height) { raw.width = live.width = previewWidth; raw.height = live.height = height; }
      camera.drawFrame(video, raw); Mochi.effectCache.delete(raw);
      if (crown) { wasCrown = true; Mochi.trackLiveCrown?.(raw); Mochi.updateLiveCrown?.(raw); }
      const filtered = Mochi.processPhoto(raw, filter, Mochi.options.intensity ?? 75, {width: previewWidth, reuse: true});
      const ctx = live.getContext("2d"); ctx.filter = Mochi.filters[filter] || "none"; ctx.drawImage(filtered, 0, 0, live.width, live.height); ctx.filter = "none";
      live.hidden = false; video.style.visibility = "hidden"; video.style.filter = "";
      metrics.frames++; metrics.width = previewWidth; metrics.native = false; metrics.lastCost = performance.now() - startTime;
      slowFrames = metrics.lastCost > 24 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames >= 8 && previewWidth > 192) { previewWidth = previewWidth > 240 ? 240 : 192; slowFrames = 0; }
    } catch (error) {
      nativeView(); console.warn("Camera preview recovered", error);
    } finally { schedule(); }
  }
  const start = camera.start, stop = camera.stop;
  camera.start = async function () {
    await start.call(this);
    if (this.stream) { cancel(); last = -Infinity; slowFrames = 0; metrics.frames = 0; schedule(); }
  };
  camera.stop = function () {
    cancel(); live.hidden = true; crownStatus.hidden = true; video.style.visibility = ""; video.style.filter = "";
    Mochi.liveEffectBuffers?.delete(raw); Mochi.liveCrownBuffers?.delete(raw); Mochi.effectCache.delete(raw); stop.call(this);
  };
  const controls = camera.controls;
  camera.controls = function () { controls.call(this); choice.value = Mochi.options.filter; choice.disabled = this.busy || this.preparingLight || this.starting; };
  const style = document.createElement("style");
  style.textContent = ".crown-tracking-status{font-size:11px;color:var(--muted);line-height:1.6;margin:10px 0 0}#live-filter{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.live-filter-choice{display:flex;align-items:center;gap:10px;font-size:12px;margin-top:12px}.live-filter-choice select{flex:1;min-width:0;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink);font:inherit}";
  document.head.append(style);
})();

(() => {
  const camera = Mochi.camera;
  const label = document.createElement('label'); label.htmlFor = 'session-mode'; label.textContent = 'Mode pengambilan';
  const select = document.createElement('select'); select.id = 'session-mode';
  for (const [value, text] of [['auto', 'Otomatis · semua pose'], ['manual', 'Manual · satu foto per klik']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option);
  }
  const container = document.createElement('div'); container.className = 'flash-settings'; container.append(label, select);
  document.querySelector('#counts').after(container);
  const cancel = document.createElement('button'); cancel.id = 'cancel-capture'; cancel.className = 'secondary'; cancel.textContent = 'Batalkan pengambilan'; cancel.hidden = true;
  document.querySelector('.camera-actions').after(cancel);
  cancel.onclick = () => { camera.stop(); camera.retakeIndex = null; if (Mochi.photos.length) location.hash = 'review'; };
  camera.updateCaptureLabel = function () {
    const retake = Number.isInteger(this.retakeIndex);
    document.querySelector('#capture').textContent = retake ? `Ambil ulang foto ${this.retakeIndex + 1} ♡` : this.sessionMode === 'auto' ? `Mulai sesi · ${Math.max(0, this.count - Mochi.photos.length)} foto ♡` : `Ambil foto ${Math.min(this.count, Mochi.photos.length + 1)} ♡`;
    document.querySelector('#studio .session-tip p').textContent = this.sessionMode === 'auto' ? 'Satu klik untuk semua pose. Setiap foto memakai countdown 3 detik. Ganti pose setelah jepretan.' : 'Satu foto per klik dengan countdown 3 detik. Ganti pose lalu tekan ambil foto berikutnya.';
  };
  select.onchange = () => { camera.sessionMode = select.value; camera.updateCaptureLabel(); };
  const controls = camera.controls;
  camera.controls = function () {
    controls.call(this); select.disabled = this.busy || this.preparingLight || this.starting;
    cancel.hidden = !(this.busy || this.preparingLight);
    if (!this.busy) this.updateCaptureLabel();
  };
})();
