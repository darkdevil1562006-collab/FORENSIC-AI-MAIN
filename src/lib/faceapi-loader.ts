import * as faceapi from 'face-api.js'

let _loaded: Promise<void> | null = null

export function loadFaceApiModels(modelUrl = '/models') {
  if (_loaded) return _loaded
  _loaded = (async () => {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
      faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl).catch(() => {})
    ])
  })()
  return _loaded
}

/**
 * Utility to create consistent TinyFaceDetector options across the app.
 * Use a larger inputSize for more stable landmark alignment when images
 * are high-resolution. scoreThreshold filters out weak detections.
 */
export function tinyFaceOptions(inputSize = 512, scoreThreshold = 0.5) {
  // face-api.js TinyFaceDetectorOptions accepts an object with inputSize and scoreThreshold
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold })
}

export default loadFaceApiModels
