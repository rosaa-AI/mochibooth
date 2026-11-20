/* Face inference stays off the camera/UI thread when OffscreenCanvas is available. */
let detector;
self.onmessage = async ({data}) => {
  try {
    if (data.type === "init") {
      const assets = new URL(data.assets);
      const {FaceDetector, FilesetResolver} = await import(new URL("vision_bundle.js", assets).href);
      const vision = await FilesetResolver.forVisionTasks(new URL("wasm", assets).href);
      detector = await FaceDetector.createFromOptions(vision, {
        canvas: new OffscreenCanvas(1, 1),
        baseOptions: {modelAssetPath: new URL("blaze_face_short_range.tflite", assets).href, delegate: "CPU"},
        runningMode: "IMAGE", minDetectionConfidence: 0.5, minSuppressionThreshold: 0.3
      });
      self.postMessage({type: "ready"});
    } else if (data.type === "frame") {
      try {
        self.postMessage({type: "result", id: data.id, result: detector.detect(data.bitmap)});
      } finally { data.bitmap.close(); }
    }
  } catch (error) {
    self.postMessage({type: "error", id: data.id, message: String(error.message || error)});
  }
};
