/* On-device face tracking for Pink Heart Crown, including Safari. */
(() => {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const assets = new URL("assets/face-tracking/", document.baseURI);
  const tracker = Mochi.crownTracker = {
    detector: null, loading: null, pendingPhotos: new WeakMap(),
    livePose: null, liveJob: null, lastScan: -Infinity, lastSeen: -Infinity,
    lastUpdate: -Infinity, epoch: 0, retryAfter: 0, state: "idle",
    setState(state) {
      this.state = state;
      const status = document.querySelector("#crown-tracking-status");
      if (!status) return;
      status.hidden = Mochi.options.filter !== "Pink Heart Crown" || !Mochi.camera?.stream;
      status.textContent = {
        loading: "Menyiapkan pelacakan wajah…",
        searching: "Arahkan wajah ke kamera agar mahkota mengikuti.",
        tracking: "Heart Crown mengikuti wajah ♡",
        error: "Pelacak wajah belum termuat. Periksa koneksi, lalu pilih Heart Crown lagi."
      }[state] || "";
    },
    async createWorkerDetector() {
      const owner = this, worker = new Worker(new URL("js/face-worker.js?v=20261117-smooth-camera", document.baseURI));
      let id = 0, failed = false, readyResolve, readyReject;
      const pending = new Map();
      const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
      const startup = setTimeout(() => fail(new Error("Face worker startup timed out")), 30000);
      function fail(error) {
        if (failed) return; failed = true; clearTimeout(startup); worker.terminate();
        owner.workerDisabled = true;
        if (owner.detector?.backend === "worker") owner.detector = null;
        readyReject(error);
        for (const request of pending.values()) { clearTimeout(request.timer); request.reject(error); }
        pending.clear();
      }
      worker.onerror = () => fail(new Error("Face worker unavailable"));
      worker.onmessage = ({data}) => {
        if (data.type === "ready") { clearTimeout(startup); readyResolve(); return; }
        if (data.type === "error") { fail(new Error(data.message)); return; }
        const request = pending.get(data.id);
        if (request) { pending.delete(data.id); clearTimeout(request.timer); request.resolve(data.result); }
      };
      worker.postMessage({type: "init", assets: assets.href});
      await ready;
      return {
        backend: "worker",
        async detect(image) {
          if (failed) throw new Error("Face worker stopped");
          const bitmap = await createImageBitmap(image);
          if (failed) { bitmap.close(); throw new Error("Face worker stopped"); }
          return new Promise((resolve, reject) => {
            const requestId = ++id;
            const timer = setTimeout(() => fail(new Error("Face worker frame timed out")), 5000);
            pending.set(requestId, {resolve, reject, timer});
            try { worker.postMessage({type: "frame", id: requestId, bitmap}, [bitmap]); }
            catch (error) { bitmap.close(); fail(error); }
          });
        }
      };
    },
    async createDetector() {
      if (!this.workerDisabled && typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined" && typeof createImageBitmap === "function") {
        try { return await this.createWorkerDetector(); } catch { this.workerDisabled = true; }
      }
      const { FaceDetector, FilesetResolver } = await import(new URL("vision_bundle.js", assets).href);
      const vision = await FilesetResolver.forVisionTasks(new URL("wasm", assets).href);
      const detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: new URL("blaze_face_short_range.tflite", assets).href, delegate: "CPU" },
        runningMode: "IMAGE", minDetectionConfidence: 0.5, minSuppressionThreshold: 0.3
      });
      detector.backend = "main"; return detector;
    },
    ensure() {
      if (this.detector) return Promise.resolve(this.detector);
      if (this.loading) return this.loading;
      if (performance.now() < this.retryAfter) return Promise.resolve(null);
      this.setState("loading");
      this.loading = this.createDetector().then(detector => {
        this.detector = detector; this.retryAfter = 0; this.setState("searching"); return detector;
      }).catch(error => {
        this.error = error; console.warn("Heart Crown model unavailable", error);
        this.retryAfter = performance.now() + 5000; this.setState("error"); return null;
      }).finally(() => { this.loading = null; });
      return this.loading;
    },
    snapshot(photo, reuse = false) {
      const canvas = (reuse && this.liveSnapshot) || document.createElement("canvas");
      if (reuse) this.liveSnapshot = canvas;
      const width = Math.min(320, photo.width), height = Math.round(width * photo.height / photo.width);
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      canvas.getContext("2d").drawImage(photo, 0, 0, canvas.width, canvas.height);
      return canvas;
    },
    poseFor(face, image) {
      const box = face.boundingBox;
      if (!box || !(box.width > 0 && box.height > 0)) return null;
      const eyes = (face.keypoints || []).slice(0, 2).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y)).sort((a, b) => a.x - b.x);
      let angle = 0, x = box.originX + box.width / 2, y = box.originY - box.height * 0.08;
      if (eyes.length === 2) {
        const left = {x: eyes[0].x * image.width, y: eyes[0].y * image.height};
        const right = {x: eyes[1].x * image.width, y: eyes[1].y * image.height};
        angle = clamp(Math.atan2(right.y - left.y, right.x - left.x), -0.9, 0.9);
        const offset = box.height * 0.48;
        x = (left.x + right.x) / 2 + Math.sin(angle) * offset;
        y = (left.y + right.y) / 2 - Math.cos(angle) * offset;
      }
      return {
        x: clamp(x / image.width * 100, -5, 105),
        y: clamp(y / image.height * 100, -10, 100),
        size: clamp(box.width / image.width * 100 / 0.38, 35, 220),
        angle, area: box.width * box.height
      };
    },
    findPose(result, image, previous) {
      const poses = (result.detections || []).map(face => this.poseFor(face, image)).filter(Boolean);
      if (!poses.length) return null;
      if (!previous) return poses.sort((a,b) => b.area - a.area)[0];
      return poses.sort((a,b) => Math.hypot(a.x - previous.x, a.y - previous.y) - Math.hypot(b.x - previous.x, b.y - previous.y))[0];
    },
    smooth(next, now) {
      if (!this.livePose || now - this.lastSeen > 300) return next;
      const alpha = clamp(1 - Math.exp(-(now - this.lastUpdate) / 70), 0.25, 0.95);
      const pose = {};
      for (const key of ["x", "y", "size", "angle"]) pose[key] = this.livePose[key] + (next[key] - this.livePose[key]) * alpha;
      return pose;
    },
    reset() {
      this.epoch++; this.livePose = null; this.liveJob = null; this.displayPose = null; this.displayTime = 0;
      this.lastScan = -Infinity; this.lastSeen = -Infinity; this.lastUpdate = -Infinity;
      this.setState(this.detector ? "searching" : "idle");
    }
  };
  Mochi.ensureCrownTracker = () => tracker.ensure();
  Mochi.resetLiveCrown = () => tracker.reset();
  Mochi.trackLiveCrown = function (photo) {
    const now = performance.now();
    if (tracker.livePose && now - tracker.lastSeen > 300) {
      tracker.livePose = null; this.crownDetections.delete(photo);
    }
    if (tracker.liveJob || now - tracker.lastScan < (tracker.detector?.backend === "main" ? 160 : 100)) return;
    const job = {}, epoch = tracker.epoch;
    tracker.liveJob = job; tracker.lastScan = now;
    job.promise = (async () => {
      const detector = await tracker.ensure();
      if (!detector || epoch !== tracker.epoch || Mochi.options.filter !== "Pink Heart Crown") return;
      const snapshot = tracker.snapshot(photo, true);
      const result = await detector.detect(snapshot);
      if (epoch !== tracker.epoch || Mochi.options.filter !== "Pink Heart Crown") return;
      const pose = tracker.findPose(result, snapshot, tracker.livePose);
      const time = performance.now();
      if (pose) {
        tracker.livePose = tracker.smooth(pose, time);
        tracker.lastSeen = time; tracker.lastUpdate = time;
        Mochi.crownDetections.set(photo, {...tracker.livePose});
        tracker.setState("tracking");
      } else if (time - tracker.lastSeen > 200) {
        tracker.livePose = null; Mochi.crownDetections.delete(photo); tracker.setState("searching");
      }
    })().catch(() => {
      if (epoch === tracker.epoch) {
        tracker.livePose = null; Mochi.crownDetections.delete(photo); tracker.setState("error");
      }
    }).finally(() => { if (tracker.liveJob === job) tracker.liveJob = null; });
    return job.promise;
  };
  Mochi.updateLiveCrown = function (photo) {
    const now = performance.now(), target = tracker.livePose;
    if (!target || now - tracker.lastSeen > 300) { tracker.displayPose = null; this.crownDetections.delete(photo); return; }
    const previous = tracker.displayPose, alpha = 1 - Math.exp(-Math.min(100, now - (tracker.displayTime || now - 33)) / 40);
    const pose = {};
    for (const key of ["x", "y", "size", "angle"]) pose[key] = previous ? previous[key] + (target[key] - previous[key]) * alpha : target[key];
    tracker.displayPose = pose; tracker.displayTime = now; this.crownDetections.set(photo, pose);
  };
  Mochi.freezeCrown = function (photo) {
    if (tracker.livePose && performance.now() - tracker.lastSeen <= 300) {
      this.crownDetections.set(photo, {...(tracker.displayPose || tracker.livePose)});
      return true;
    }
    return false;
  };
  Mochi.detectCrown = function (photo) {
    if (this.crownDetections.has(photo)) return Promise.resolve(this.crownDetections.get(photo));
    if (tracker.pendingPhotos.has(photo)) return tracker.pendingPhotos.get(photo);
    // Copy now: the input may be a preview canvas that changes on the next frame.
    const snapshot = tracker.snapshot(photo);
    const pending = (async () => {
      const detector = await tracker.ensure();
      if (!detector) return null;
      const result = await detector.detect(snapshot);
      const pose = tracker.findPose(result, snapshot, null);
      Mochi.crownDetections.set(photo, pose);
      if (Mochi.photos.includes(photo) && Mochi.options.filter === "Pink Heart Crown") {
        Mochi.editor?.update();
        if (document.querySelector("#review.active")) Mochi.review?.show();
      }
      return pose;
    })().catch(() => null).finally(() => tracker.pendingPhotos.delete(photo));
    tracker.pendingPhotos.set(photo, pending);
    return pending;
  };
})();
