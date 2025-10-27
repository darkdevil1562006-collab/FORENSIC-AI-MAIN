import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import * as faceapi from '@vladmandic/face-api';
import * as mobilenet from '@tensorflow-models/mobilenet';

export interface DeepfakeAnalysisResult {
    isReal: boolean;
    confidence: number;
    details: {
        faceAuthenticityScore: number;
        imageQualityScore: number;
        colorEffectScore?: number;
        consistencyScore: number;
        metadata: {
            artifactsDetected: string[];
            warnings: string[];
        };
    };
}

interface AnalysisMetrics {
    noisePatterns: number;
    edgeCoherence: number;
    textureConsistency: number;
    colorDistribution: number;
    colorEffect: number;
    faceFeatureAlignment: number;
}

export class DeepfakeAnalyzer {
    private blazefaceModel: blazeface.BlazeFaceModel | null = null;
    private mobileNetModel: mobilenet.MobileNet | null = null;
    private modelsLoaded: boolean = false;

    async loadModels() {
        if (this.modelsLoaded) return;

        try {
            // Load models in parallel
            const [blazefaceResult, mobilenetResult] = await Promise.all([
                blazeface.load(),
                mobilenet.load()
            ]);

            this.blazefaceModel = blazefaceResult;
            this.mobileNetModel = mobilenetResult;

            // Load face-api models
            await Promise.all([
                faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
                faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
            ]);

            this.modelsLoaded = true;
        } catch (error) {
            console.error('Error loading ML models:', error);
            throw new Error('Failed to load ML models');
        }
    }

    private async analyzeFaceAuthenticity(imageElement: HTMLImageElement): Promise<number> {
        if (!this.blazefaceModel) throw new Error('Models not loaded');

        // Detect faces
    const predictions = await this.blazefaceModel.estimateFaces(imageElement, false);
        
        if (predictions.length === 0) {
            return 0; // No faces detected
        }

        // Get face landmarks using face-api.js for detailed analysis with consistent detector options
        // Use TinyFaceDetectorOptions to improve stability across images
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const detections = await faceapi.detectAllFaces(imageElement, new (faceapi as any).TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 }))
            .withFaceLandmarks()
            .withFaceDescriptors();

        if (detections.length === 0) return 0;

        let authenticityScore = 0;
        
        for (const detection of detections) {
            // Analyze facial feature proportions
            const landmarks = detection.landmarks;
            const descriptors = detection.descriptor;
            
            // Check facial symmetry
            const symmetryScore = this.analyzeFacialSymmetry(landmarks.positions);
            
            // Analyze feature consistency
            const consistencyScore = this.analyzeFeatureConsistency(descriptors);
            
            // Check for natural skin texture variations
            const textureScore = this.analyzeSkinTexture(imageElement, detection.detection.box);
            
            // Weighted average of all scores
            authenticityScore += (symmetryScore * 0.3 + consistencyScore * 0.4 + textureScore * 0.3);
        }

        return authenticityScore / detections.length;
    }

    private analyzeFacialSymmetry(landmarks: faceapi.Point[]): number {
        let symmetryScore = 0;
        const midPoint = landmarks[27]; // Nose bridge point
        
        // Analyze key symmetric points (eyes, eyebrows, mouth corners)
        const symmetricPairs = [
            [0, 16],  // Jaw line
            [1, 15],
            [2, 14],
            [3, 13],
            [4, 12],
            [5, 11],
            [6, 10],
            [7, 9],
            [36, 45], // Eyes
            [37, 44],
            [38, 43],
            [39, 42],
            [40, 47],
            [41, 46]
        ];

        for (const [leftIdx, rightIdx] of symmetricPairs) {
            const leftPoint = landmarks[leftIdx];
            const rightPoint = landmarks[rightIdx];
            
            // Calculate distances from midline
            const leftDist = Math.sqrt(
                Math.pow(leftPoint.x - midPoint.x, 2) + 
                Math.pow(leftPoint.y - midPoint.y, 2)
            );
            const rightDist = Math.sqrt(
                Math.pow(rightPoint.x - midPoint.x, 2) + 
                Math.pow(rightPoint.y - midPoint.y, 2)
            );

            // Compare symmetry (1 = perfect symmetry). Guard against divide-by-zero.
            const denom = Math.max(leftDist, rightDist, 1e-6);
            const pairSymmetry = 1 - Math.abs(leftDist - rightDist) / denom;
            symmetryScore += pairSymmetry;
        }

        return symmetryScore / symmetricPairs.length;
    }

    private analyzeFeatureConsistency(descriptors: Float32Array): number {
        // Analyze the distribution of facial feature descriptors
        let consistencyScore = 0;
        const meanDesc = tf.tensor1d(descriptors).mean().arraySync() as number;
        const stdDesc = tf.tensor1d(descriptors).sub(meanDesc).square().mean().sqrt().arraySync() as number;
        
        // Real faces tend to have more varied but consistent descriptor patterns
        const normalizedStd = Math.min(stdDesc * 5, 1); // Scale up variation, cap at 1
        consistencyScore = 0.5 + (normalizedStd * 0.5); // Base 0.5 + up to 0.5 for natural variation

        return consistencyScore;
    }

    private analyzeSkinTexture(image: HTMLImageElement, box: any): number {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return 0;

        // Normalize box format: support both { x,y,width,height } and { topLeft: [x,y], bottomRight: [x,y] }
        let x = 0, y = 0, width = 0, height = 0
        if (box && typeof box.x === 'number') {
            x = Math.max(0, Math.round(box.x))
            y = Math.max(0, Math.round(box.y))
            width = Math.max(1, Math.round(box.width || box.right - box.x || 0))
            height = Math.max(1, Math.round(box.height || box.bottom - box.y || 0))
        } else if (box && Array.isArray(box.topLeft) && Array.isArray(box.bottomRight)) {
            x = Math.max(0, Math.round(box.topLeft[0]))
            y = Math.max(0, Math.round(box.topLeft[1]))
            width = Math.max(1, Math.round(box.bottomRight[0] - box.topLeft[0]))
            height = Math.max(1, Math.round(box.bottomRight[1] - box.topLeft[1]))
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Analyze local contrast variations (natural skin has subtle variations)
        let naturalVariation = 0;
        const blockSize = 4;
        
        for (let i = 0; i < height - blockSize; i += blockSize) {
            for (let j = 0; j < width - blockSize; j += blockSize) {
                const blockVariance = this.calculateLocalVariance(data, j, i, width, blockSize);
                naturalVariation += this.isNaturalVariation(blockVariance) ? 1 : 0;
            }
        }

        const totalBlocks = Math.max(1, Math.floor((width / blockSize) * (height / blockSize)));
        return naturalVariation / totalBlocks;
    }

    private analyzeColorEffects(imageData: ImageData): number {
        const data = imageData.data;
        const length = data.length / 4;

        // Hue/Saturation analysis: count pixels with very high saturation
        let highSatCount = 0;
        // Hue concentration bins (0-360 divided into 12 bins)
        const hueBins = new Array(12).fill(0);

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const delta = max - min;

            // compute saturation
            const sat = max === 0 ? 0 : delta / max;
            if (sat > 0.7) highSatCount++;

            // compute hue (approx)
            let hue = 0;
            if (delta !== 0) {
                if (max === r) hue = ((g - b) / delta) % 6;
                else if (max === g) hue = (b - r) / delta + 2;
                else hue = (r - g) / delta + 4;
                hue = Math.round(hue * 60);
                if (hue < 0) hue += 360;
            }
            const bin = Math.floor(hue / 30) % 12;
            hueBins[bin]++;
        }

        const highSatRatio = highSatCount / length; // fraction of highly saturated pixels

        // compute hue concentration entropy
        const total = hueBins.reduce((a, b) => a + b, 0) || 1;
        let entropy = 0;
        for (const b of hueBins) {
            if (b > 0) {
                const p = b / total;
                entropy -= p * Math.log2(p);
            }
        }
        // Normalize entropy (max for 12 bins = log2(12))
        const maxEntropy = Math.log2(12);
        const hueEntropy = entropy / maxEntropy; // 0..1

        // High-saturation with low hue entropy suggests a heavy color effect
        // Combine into a score where 1.0 == strong color effect (likely edited)
        const colorEffectScore = Math.min(1, Math.max(0, highSatRatio * (1 - hueEntropy) * 3));

        return colorEffectScore; // 0..1
    }

    private calculateLocalVariance(data: Uint8ClampedArray, x: number, y: number, width: number, blockSize: number): number {
        let sum = 0;
        let sumSq = 0;
        let count = 0;

        for (let i = 0; i < blockSize; i++) {
            for (let j = 0; j < blockSize; j++) {
                const idx = ((y + i) * width + (x + j)) * 4;
                const value = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                sum += value;
                sumSq += value * value;
                count++;
            }
        }

        const mean = sum / count;
        return (sumSq / count) - (mean * mean);
    }

    private isNaturalVariation(variance: number): boolean {
        // Natural skin typically has subtle variations
        // Too low variance = artificial smoothing
        // Too high variance = artificial patterns
        return variance > 20 && variance < 200;
    }

    private async analyzeImageQuality(imageElement: HTMLImageElement): Promise<number> {
        if (!this.mobileNetModel) throw new Error('Models not loaded');

        // Get image features using MobileNet
        const predictions = await this.mobileNetModel.classify(imageElement);
        
        // Analyze image quality metrics
        const metrics = await this.calculateImageMetrics(imageElement);
        
        // Combine multiple factors for quality score, include colorEffect as a negative indicator
        // colorEffect in metrics is 0..1 where higher means strong color grading/effect
        const colorEffectPenalty = Math.max(0, metrics.colorEffect - 0.25); // small penalty threshold

        const qualityScore = (
            metrics.noisePatterns * 0.18 +
            metrics.edgeCoherence * 0.18 +
            metrics.textureConsistency * 0.28 +
            metrics.colorDistribution * 0.16 +
            metrics.faceFeatureAlignment * 0.1 -
            colorEffectPenalty * 0.2
        );

        return qualityScore;
    }

    private async calculateImageMetrics(imageElement: HTMLImageElement): Promise<AnalysisMetrics> {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        canvas.width = imageElement.width;
        canvas.height = imageElement.height;
        ctx.drawImage(imageElement, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Initialize metrics
        const metrics: AnalysisMetrics = {
            noisePatterns: this.analyzeNoisePatterns(data),
            edgeCoherence: this.analyzeEdgeCoherence(data, canvas.width, canvas.height),
            textureConsistency: this.analyzeTextureConsistency(data, canvas.width),
            colorDistribution: this.analyzeColorDistribution(data),
            colorEffect: this.analyzeColorEffects(imageData),
            faceFeatureAlignment: await this.analyzeFaceFeatureAlignment(imageElement)
        };

        return metrics;
    }

    private analyzeNoisePatterns(data: Uint8ClampedArray): number {
        let naturalNoiseCount = 0;
        
        // Analyze local pixel variations
        for (let i = 0; i < data.length; i += 4) {
            if (i + 7 < data.length) {
                const variation = Math.abs(data[i] - data[i + 4]) +
                                Math.abs(data[i + 1] - data[i + 5]) +
                                Math.abs(data[i + 2] - data[i + 6]);
                                
                // Natural images have organic noise patterns
                if (variation > 3 && variation < 50) {
                    naturalNoiseCount++;
                }
            }
        }

        return Math.min(naturalNoiseCount / (data.length / 4), 1);
    }

    private analyzeEdgeCoherence(data: Uint8ClampedArray, width: number, height: number): number {
        let coherentEdges = 0;
        let totalEdges = 0;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const surroundingPixels = [
                    (y * width + (x - 1)) * 4,     // left
                    (y * width + (x + 1)) * 4,     // right
                    ((y - 1) * width + x) * 4,     // top
                    ((y + 1) * width + x) * 4      // bottom
                ];

                let edgeStrength = 0;
                for (const pixelIdx of surroundingPixels) {
                    edgeStrength += Math.abs(data[idx] - data[pixelIdx]);
                }

                if (edgeStrength > 30) { // Edge detected
                    totalEdges++;
                    // Check if edge transition is natural
                    if (this.isNaturalEdgeTransition(data, idx, surroundingPixels)) {
                        coherentEdges++;
                    }
                }
            }
        }

        return totalEdges > 0 ? coherentEdges / totalEdges : 0;
    }

    private isNaturalEdgeTransition(data: Uint8ClampedArray, centerIdx: number, surroundingIndices: number[]): boolean {
        // Natural edges have gradual transitions
        let naturalTransitions = 0;
        
        for (const idx of surroundingIndices) {
            const diff = Math.abs(data[centerIdx] - data[idx]);
            if (diff > 5 && diff < 100) naturalTransitions++;
        }

        return naturalTransitions >= 2;
    }

    private analyzeTextureConsistency(data: Uint8ClampedArray, width: number): number {
        let consistentTextures = 0;
        let totalPatterns = 0;

        // Analyze 4x4 blocks for texture patterns
        for (let i = 0; i < data.length; i += 16) {
            if (i % (width * 4) > width * 4 - 16) continue; // Skip end of rows

            const pattern = this.getTexturePattern(data, i, width);
            if (this.isNaturalTexturePattern(pattern)) {
                consistentTextures++;
            }
            totalPatterns++;
        }

        return totalPatterns > 0 ? consistentTextures / totalPatterns : 0;
    }

    private getTexturePattern(data: Uint8ClampedArray, startIdx: number, width: number): number[] {
        const pattern = [];
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                const idx = startIdx + y * width * 4 + x * 4;
                if (idx + 2 < data.length) {
                    pattern.push((data[idx] + data[idx + 1] + data[idx + 2]) / 3);
                }
            }
        }
        return pattern;
    }

    private isNaturalTexturePattern(pattern: number[]): boolean {
        // Calculate variance of the pattern
        const mean = pattern.reduce((a, b) => a + b, 0) / pattern.length;
        const variance = pattern.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / pattern.length;
        
        // Natural textures have moderate variance
        return variance > 25 && variance < 2000;
    }

    private analyzeColorDistribution(data: Uint8ClampedArray): number {
        const colorBins = new Array(8).fill(0); // 8 main color ranges
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Simplified color binning
            const binIndex = Math.floor((r + g + b) / (3 * 32));
            colorBins[binIndex]++;
        }

        // Calculate distribution entropy (more uniform = more natural)
        const total = colorBins.reduce((a, b) => a + b, 0);
        let entropy = 0;
        
        for (const bin of colorBins) {
            if (bin > 0) {
                const p = bin / total;
                entropy -= p * Math.log2(p);
            }
        }

        // Normalize entropy (max entropy for 8 bins is 3)
        return entropy / 3;
    }

    private async analyzeFaceFeatureAlignment(imageElement: HTMLImageElement): Promise<number> {
        const detections = await faceapi.detectAllFaces(imageElement)
            .withFaceLandmarks();

        if (detections.length === 0) return 0;

        let alignmentScore = 0;
        
        for (const detection of detections) {
            const landmarks = detection.landmarks;
            const positions = landmarks.positions;
            
            // Check eye level alignment
            const leftEye = positions[36];
            const rightEye = positions[45];
            const eyeAngle = Math.abs(Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x));
            
            // Check facial feature proportions
            const nose = positions[30];
            const leftMouth = positions[48];
            const rightMouth = positions[54];
            
            const eyeDistance = Math.sqrt(Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2));
            const mouthWidth = Math.sqrt(Math.pow(rightMouth.x - leftMouth.x, 2) + Math.pow(rightMouth.y - leftMouth.y, 2));
            
            // Natural faces have certain proportion ranges
            const eyeMouthRatio = eyeDistance / mouthWidth;
            const isNaturalRatio = eyeMouthRatio > 0.8 && eyeMouthRatio < 1.2;
            
            alignmentScore += (1 - eyeAngle / (Math.PI / 4)) * 0.5 + (isNaturalRatio ? 0.5 : 0);
        }

        return alignmentScore / detections.length;
    }

    public async analyze(imageElement: HTMLImageElement): Promise<DeepfakeAnalysisResult> {
        if (!this.modelsLoaded) {
            await this.loadModels();
        }

        // Run all analyses in parallel
        const [
            faceAuthenticityScore,
            imageQualityScore
        ] = await Promise.all([
            this.analyzeFaceAuthenticity(imageElement),
            this.analyzeImageQuality(imageElement)
        ]);

        // Also get detailed metrics (including colorEffect)
        const metrics = await this.calculateImageMetrics(imageElement);
        const colorEffectScore = metrics.colorEffect; // 0..1
        // Calculate consistency score based on multiple factors
        const consistencyScore = (faceAuthenticityScore + imageQualityScore) / 2;

        // Collect warnings and artifacts
        const warnings: string[] = [];
        const artifacts: string[] = [];

        if (faceAuthenticityScore < 0.6) {
            artifacts.push("Unusual facial feature patterns detected");
        }
        if (imageQualityScore < 0.5) {
            artifacts.push("Abnormal image quality patterns");
        }
        if (colorEffectScore > 0.5) {
            artifacts.push("Heavy color grading or colored-light effects detected");
            warnings.push("Strong color effects may indicate synthetic editing");
        }
        if (consistencyScore < 0.55) {
            warnings.push("Multiple indicators suggest potential manipulation");
        }
        // Decrease confidence when heavy color effects present (penalize)
        const colorPenalty = Math.max(0, colorEffectScore - 0.25);
        const rawConfidence = (faceAuthenticityScore * 0.4 + imageQualityScore * 0.3 + consistencyScore * 0.3);
        const confidence = Math.max(0, (rawConfidence - colorPenalty * 0.2) * 100);
        
        return {
            isReal: confidence > 65,
            confidence,
            details: {
                faceAuthenticityScore: faceAuthenticityScore * 100,
                imageQualityScore: imageQualityScore * 100,
                colorEffectScore: colorEffectScore * 100,
                consistencyScore: consistencyScore * 100,
                metadata: {
                    artifactsDetected: artifacts,
                    warnings: warnings
                }
            }
        };
    }
}