"use client";

import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import loadFaceApiModels from "@/lib/faceapi-loader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type LabeledDescriptor = {
  label: string;
  descriptors: Float32Array[];
};

export default function LiveFaceRecognition({
  onCapture,
}: {
  onCapture?: (dataUrl: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [permissionState, setPermissionState] = useState<
    "unknown" | "granted" | "denied" | "prompt"
  >("unknown");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [status, setStatus] = useState("Loading models...");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [labeledDescriptors, setLabeledDescriptors] = useState<
    LabeledDescriptor[]
  >([]);
  const recognitionRef = useRef<faceapi.FaceMatcher | null>(null);
  const [autoCapture, setAutoCapture] = useState(false);
  const [captureThreshold, setCaptureThreshold] = useState(0.5);
  const [captures, setCaptures] = useState<
    { dataUrl: string; label: string; ts: number }[]
  >([]);
  const { toast } = useToast();
  const lastCaptureRef = useRef<Record<string, number>>({});

  useEffect(() => {
    let mounted = true;

    // Query permission status for camera where supported to provide clearer UI
    (async () => {
      try {
        if (
          (navigator as any).permissions &&
          (navigator as any).permissions.query
        ) {
          try {
            const p = await (navigator as any).permissions.query({
              name: "camera" as any,
            });
            if (!mounted) return;
            if (p.state === "granted") setPermissionState("granted");
            else if (p.state === "denied") setPermissionState("denied");
            else setPermissionState("prompt");
            p.onchange = () => {
              if (!mounted) return;
              setPermissionState(
                p.state === "granted"
                  ? "granted"
                  : p.state === "denied"
                  ? "denied"
                  : "prompt"
              );
            };
          } catch {
            // some browsers may not support 'camera' name; fallback to prompt
            setPermissionState("prompt");
          }
        } else {
          setPermissionState("prompt");
        }
      } catch (e) {
        setPermissionState("unknown");
      }
      // enumerate devices for selection
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const cams = devs.filter((d) => d.kind === "videoinput");
        if (mounted) setDevices(cams);
      } catch (e) {
        console.warn("Failed to enumerate devices", e);
      }
    })();

    async function loadModels() {
      const modelUrl = "/models"; // serve models from public/models
      try {
        await loadFaceApiModels(modelUrl);
        if (!mounted) return;
        setStatus("Models loaded");
        // After models are loaded, attempt to read saved suspects with descriptors
        try {
          const raw = localStorage.getItem("suspects");
          if (raw) {
            const arr = JSON.parse(raw) as any[];
            const labeled: LabeledDescriptor[] = [];
            for (const s of arr) {
              // support faceDescriptors (array of number[])
              if (s && s.faceDescriptors && Array.isArray(s.faceDescriptors)) {
                const descs: Float32Array[] = [];
                for (const d of s.faceDescriptors) {
                  if (Array.isArray(d)) descs.push(Float32Array.from(d));
                }
                if (descs.length)
                  labeled.push({ label: s.name || s.id, descriptors: descs });
              }
              // backward compatibility: single faceDescriptor
              else if (
                s &&
                s.faceDescriptor &&
                Array.isArray(s.faceDescriptor)
              ) {
                const full = Float32Array.from(s.faceDescriptor as number[]);
                labeled.push({ label: s.name || s.id, descriptors: [full] });
              }
            }
            if (labeled.length > 0) setLabeledDescriptors(labeled);
          }
        } catch (e) {
          console.warn("Failed to load saved descriptors", e);
        }
      } catch (err) {
        setStatus("Failed to load models");
        console.error("Error loading face-api models", err);
      }
    }

    loadModels();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (labeledDescriptors.length > 0) {
      recognitionRef.current = new faceapi.FaceMatcher(
        labeledDescriptors.map(
          (ld) => new faceapi.LabeledFaceDescriptors(ld.label, ld.descriptors)
        ),
        0.6
      );
    } else {
      recognitionRef.current = null;
    }
  }, [labeledDescriptors]);

  useEffect(() => {
    let intervalId: number | null = null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    // load persisted captures
    try {
      const raw = localStorage.getItem("lfi:captures");
      if (raw) setCaptures(JSON.parse(raw));
    } catch (e) {
      console.warn("Failed to load captures from localStorage", e);
    }

    async function onPlay() {
      if (!video || !canvas) return;
      // Ensure video metadata has been loaded and we have valid dimensions
      const vw = video.videoWidth || video.clientWidth || 0;
      const vh = video.videoHeight || video.clientHeight || 0;
      const displaySize = { width: vw, height: vh };
      // If the video element reports 0, try to wait a short moment for metadata
      if (displaySize.width < 10 || displaySize.height < 10) {
        // attempt to wait until metadata/populated
        await new Promise<void>((resolve) => {
          const onMeta = () => {
            if (!video) return resolve();
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              video.removeEventListener("loadedmetadata", onMeta);
              resolve();
            }
          };
          video.addEventListener("loadedmetadata", onMeta);
          // fallback timeout
          setTimeout(() => resolve(), 500);
        });
      }
      const finalW =
        video.videoWidth || video.clientWidth || canvas.clientWidth || 640;
      const finalH =
        video.videoHeight || video.clientHeight || canvas.clientHeight || 480;
      const finalDisplay = { width: finalW, height: finalH };
      // set canvas internal pixel size to match video pixel size for accurate drawing
      canvas.width = finalDisplay.width;
      canvas.height = finalDisplay.height;
      // ensure CSS matches container so overlay aligns
      canvas.style.width = `${video.clientWidth}px`;
      canvas.style.height = `${video.clientHeight}px`;
      faceapi.matchDimensions(canvas, finalDisplay);

      intervalId = window.setInterval(async () => {
        if (video.paused || video.ended) return;
        // choose detector: prefer ssdMobilenetv1 if loaded, fallback to tiny with larger input
        let detections: any[] = [];
        try {
          if (faceapi.nets.ssdMobilenetv1.isLoaded) {
            detections = await faceapi
              .detectAllFaces(
                video,
                new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 })
              )
              .withFaceLandmarks()
              .withFaceDescriptors();
          } else {
            detections = await faceapi
              .detectAllFaces(
                video,
                new faceapi.TinyFaceDetectorOptions({
                  inputSize: 512,
                  scoreThreshold: 0.3,
                })
              )
              .withFaceLandmarks()
              .withFaceDescriptors();
          }
        } catch (e) {
          console.warn("Detection error", e);
        }

        const resized = faceapi.resizeResults(detections, {
          width: canvas.width,
          height: canvas.height,
        });

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const det of resized) {
          const box = det.detection.box;
          ctx.strokeStyle = "#00FF00";
          ctx.lineWidth = 2;
          ctx.strokeRect(box.x, box.y, box.width, box.height);

          let label = "Unknown";
          if (recognitionRef.current && det.descriptor) {
            const best = recognitionRef.current.findBestMatch(det.descriptor);
            // best has { label, distance }
            if ((best as any).label && (best as any).label !== "unknown") {
              const distance = (best as any).distance as number;
              // show label and distance
              label = `${(best as any).label} (${distance.toFixed(2)})`;

              // Adjusted auto-capture: use tighter threshold (lower distance == better match)
              const autoThreshold = Math.max(0.35, captureThreshold); // don't go below 0.35
              if (autoCapture && distance <= autoThreshold) {
                const rawLabel = (best as any).label as string;
                const now = Date.now();
                const last = lastCaptureRef.current[rawLabel] || 0;
                const cooldown = 5000; // ms
                if (now - last > cooldown) {
                  // crop the face area and save snapshot
                  try {
                    const snapCanvas = document.createElement("canvas");
                    // When cropping from the video element, use the video intrinsic pixels
                    const cropW = Math.max(1, Math.floor(box.width));
                    const cropH = Math.max(1, Math.floor(box.height));
                    snapCanvas.width = cropW;
                    snapCanvas.height = cropH;
                    const sctx = snapCanvas.getContext("2d");
                    if (sctx) {
                      // Map box coordinates (which are in canvas/video pixels) back to the video source
                      // If canvas size equals video intrinsic size, coordinates map directly.
                      sctx.drawImage(
                        video,
                        box.x,
                        box.y,
                        box.width,
                        box.height,
                        0,
                        0,
                        cropW,
                        cropH
                      );
                      const dataUrl = snapCanvas.toDataURL("image/jpeg", 0.85);
                      const newCap = { dataUrl, label: rawLabel, ts: now };
                      setCaptures((prev) => {
                        const out = [newCap, ...prev];
                        try {
                          localStorage.setItem(
                            "lfi:captures",
                            JSON.stringify(out)
                          );
                        } catch (e) {}
                        return out;
                      });
                      // notify parent (face-recognition page) so it can auto-analyze
                      try {
                        onCapture && onCapture(dataUrl);
                      } catch (e) {}
                      lastCaptureRef.current[rawLabel] = now;
                    }
                  } catch (e) {
                    console.error("Auto-capture failed", e);
                  }
                }
              }
            } else {
              label = "Unknown";
            }
          }

          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(box.x, box.y + box.height, box.width, 22);
          ctx.fillStyle = "#fff";
          ctx.font = "16px sans-serif";
          ctx.fillText(label, box.x + 6, box.y + box.height + 16);
        }
      }, 150);
    }

    if (streamActive && video) {
      video.addEventListener("play", onPlay);
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      if (video) video.removeEventListener("play", onPlay);
    };
  }, [streamActive]);

  const startCamera = async () => {
    setPermissionError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      if (selectedDeviceId) {
        // prefer explicit device if selected
        (constraints.video as any) = { deviceId: { exact: selectedDeviceId } };
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      // mark permission state
      setPermissionState("granted");
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // ensure playsInline and autoplay behavior
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        // wait for metadata then play
        await new Promise<void>((resolve) => {
          const v = videoRef.current!;
          const onMeta = () => {
            v.removeEventListener("loadedmetadata", onMeta);
            resolve();
          };
          v.addEventListener("loadedmetadata", onMeta);
          // fallback
          setTimeout(() => resolve(), 500);
        });
        try {
          await videoRef.current.play();
        } catch (e) {
          /* ignore play errors */
        }
        setStreamActive(true);
      }
    } catch (err) {
      console.error("Camera access denied or not available", err);
      // Provide a concise error message for the UI and preserve the error for details
      const message =
        err && (err as Error).name ? (err as Error).name : String(err);
      setPermissionError(message);
      setStatus("Camera access error");
      // update permission state to denied if possible
      try {
        setPermissionState("denied");
      } catch {}
    }
  };

  const requestPermission = async () => {
    // Must be called from a user gesture; this attempts to get minimal access and immediately stop
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      s.getTracks().forEach((t) => t.stop());
      setPermissionState("granted");
      // re-enumerate devices now that permission granted
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        setDevices(devs.filter((d) => d.kind === "videoinput"));
      } catch (e) {}
      setPermissionError(null);
      setStatus("Camera permission granted");
    } catch (e) {
      console.warn("Permission request failed", e);
      setPermissionState("denied");
      setPermissionError(
        e && (e as Error).name ? (e as Error).name : String(e)
      );
    }
  };

  const stopCamera = () => {
    const video = videoRef.current;
    if (!video) return;
    const stream = video.srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    video.srcObject = null;
    setStreamActive(false);
  };

  const handleAddLabeled = async (label: string, file: File) => {
    // Load image and compute descriptor
    const img = await faceapi.bufferToImage(file);
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection || !detection.descriptor) {
      alert("No face found in labeled image");
      return;
    }

    setLabeledDescriptors((prev) => {
      const existing = prev.find((p) => p.label === label);
      if (existing) {
        existing.descriptors.push(detection.descriptor);
        return [...prev];
      }
      return [...prev, { label, descriptors: [detection.descriptor] }];
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={startCamera}
          disabled={streamActive}
          variant="secondary"
          size="sm"
        >
          Start Camera
        </Button>
        <Button
          onClick={stopCamera}
          disabled={!streamActive}
          variant="ghost"
          size="sm"
        >
          Stop Camera
        </Button>
        <div>
          {permissionState !== "granted" ? (
            <Button onClick={requestPermission} size="sm" variant="outline">
              Request Camera Permission
            </Button>
          ) : null}
        </div>
        {devices.length > 0 && (
          <select
            value={selectedDeviceId ?? ""}
            onChange={(e) => setSelectedDeviceId(e.target.value || null)}
            className="text-sm"
          >
            <option value="">Default camera</option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || d.deviceId}
              </option>
            ))}
          </select>
        )}
        <Button
          onClick={async () => {
            // manual capture
            const video = videoRef.current;
            if (!video) return;
            const w = video.videoWidth;
            const h = video.videoHeight;
            const c = document.createElement("canvas");
            c.width = w;
            c.height = h;
            const s = c.getContext("2d");
            if (!s) return;
            s.drawImage(video, 0, 0, w, h);
            const dataUrl = c.toDataURL("image/jpeg", 0.9);
            // run detection on the full frame
            try {
              const img = await faceapi.bufferToImage(
                await (await fetch(dataUrl)).blob()
              );
              const detection = await faceapi
                .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();
              let label = "Unknown";
              if (detection && detection.descriptor && recognitionRef.current) {
                const best = recognitionRef.current.findBestMatch(
                  detection.descriptor
                );
                label = (best as any).toString();
              }
              setCaptures((prev) => [
                { dataUrl, label, ts: Date.now() },
                ...prev,
              ]);
              // notify parent that a manual capture occurred
              try {
                onCapture && onCapture(dataUrl);
              } catch (e) {}
            } catch (e) {
              console.error("Manual capture failed", e);
            }
          }}
          disabled={!streamActive}
          variant="default"
          size="sm"
        >
          Capture Now
        </Button>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoCapture}
            onChange={(e) => setAutoCapture(e.target.checked)}
          />
          <span className="text-sm">Auto-capture</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm">Threshold</span>
          <input
            className="accent-primary"
            type="range"
            min={0.2}
            max={0.8}
            step={0.01}
            value={captureThreshold}
            onChange={(e) => setCaptureThreshold(Number(e.target.value))}
          />
          <span className="w-12 text-right text-sm">
            {captureThreshold.toFixed(2)}
          </span>
        </label>
        <span className="ml-auto text-sm">{status}</span>
      </div>

      {permissionError && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <h4 className="font-semibold">Camera permission required</h4>
          <p className="text-sm mt-1">
            Browser reported: <strong>{permissionError}</strong>
          </p>
          <p className="text-sm mt-2">
            Follow these steps to enable camera access in Microsoft Edge:
          </p>
          <ol className="text-sm list-decimal list-inside mt-2">
            <li>
              Click the lock icon in the address bar next to the URL (left
              side).
            </li>
            <li>
              Open "Site permissions" &gt; Camera and set to{" "}
              <strong>Allow</strong>.
            </li>
            <li>
              If you don't see the prompt, open{" "}
              <code>edge://settings/content/camera</code> and ensure websites
              are allowed to access the camera.
            </li>
            <li>
              Reload the page and click <em>Start Camera</em> again.
            </li>
          </ol>
          <div className="mt-3 flex gap-2">
            <Button onClick={startCamera} size="sm">
              Retry
            </Button>
            <Button asChild size="sm" variant="outline">
              <a
                href="edge://settings/content/camera"
                target="_blank"
                rel="noreferrer"
              >
                Open Edge Camera Settings
              </a>
            </Button>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-3xl">
        <video ref={videoRef} className="w-full rounded-md" muted playsInline />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">Register labeled face</h4>
        <LabeledForm onAdd={handleAddLabeled} />
        <div>
          <h5 className="font-medium">Known labels</h5>
          <ul>
            {labeledDescriptors.map((ld) => (
              <li key={ld.label}>
                {ld.label} ({ld.descriptors.length})
              </li>
            ))}
          </ul>
        </div>
      </div>

      {captures.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold">Captures</h4>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(captures));
              }}
              size="sm"
              variant="outline"
            >
              Copy JSON
            </Button>
            <Button
              onClick={() => setCaptures([])}
              size="sm"
              variant="destructive"
            >
              Clear
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {captures.map((c, idx) => (
              <div key={c.ts} className="border rounded p-1">
                <img
                  src={c.dataUrl}
                  alt={`capture-${idx}`}
                  className="w-full h-32 object-cover"
                />
                <div className="text-xs mt-1">{c.label}</div>
                <div className="flex gap-1 mt-1">
                  <Button asChild size="sm" variant="ghost">
                    <a href={c.dataUrl} download={`capture-${c.ts}.jpg`}>
                      Download
                    </a>
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/captures", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(c),
                        });
                        const json = await res.json();
                        if (json.ok) {
                          toast({
                            title: "Saved",
                            description: "Capture uploaded to server.",
                          });
                        } else {
                          toast({
                            title: "Error",
                            description: String(json.error || "Upload failed"),
                          });
                        }
                      } catch (e) {
                        console.error("Upload failed", e);
                        toast({ title: "Error", description: "Upload failed" });
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Save
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LabeledForm({
  onAdd,
}: {
  onAdd: (label: string, file: File) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const submit = async () => {
    const f = fileRef.current?.files?.[0];
    if (!label || !f) {
      alert("Provide a label and an image file");
      return;
    }
    await onAdd(label, f);
    setLabel("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex items-center gap-2">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (e.g. Deena)"
        className="input"
      />
      <input type="file" accept="image/*" ref={fileRef} className="input" />
      <button onClick={submit} className="btn">
        Add
      </button>
    </div>
  );
}
