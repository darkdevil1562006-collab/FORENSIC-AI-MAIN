Face Recognition Setup (Browser)

This project includes a client-side live face recognition component using face-api.js.

Required model files
- Download the face-api.js models (e.g., `tiny_face_detector_model-weights_manifest.json`, `face_landmark_68_model-weights_manifest.json`, `face_recognition_model-weights_manifest.json`) from the face-api.js repo or CDN.
- Place them under `public/models/` so they are served at `/models` (the component loads models from `/models`).

How it works
- The `LiveFaceRecognition` component (React client) requests camera permission and shows a video element and a canvas overlay.
- Use the "Register labeled face" form to upload one or more images with a label (e.g., `Deena`). The component computes face descriptors for those images and stores them in-memory for recognition.
- When the camera runs, faces are detected and matched against registered labels; recognized faces show labels (e.g., `Deena`) and unknown faces show `Unknown`.

Security & privacy
- Camera access is requested via `navigator.mediaDevices.getUserMedia` and only used while the component runs.
- Streams are stopped using `MediaStream.getTracks().forEach(track => track.stop())` when you stop the camera or unmount the component.

Testing
1. Start the production server or dev server: `npm run dev` or build+start.
2. Open http://localhost:9002/face-recognition
3. Go to the Live Camera tab, click "Start Camera" and allow camera access.
4. Register a labeled face from a close-up photo of the person.
5. Position that person in front of the camera; the label should appear over their face.

Notes
- For production, consider storing labeled descriptors on a secure backend instead of in-memory.
- Model download is required — I can't add model files to the repo here due to size/licensing; follow the model download instructions in the face-api.js README.
