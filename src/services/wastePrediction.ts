import type { WasteCategory } from '@/types';

export interface PredictionResult {
  category: WasteCategory;
  confidence: number;
  recommendedBin: string;
  isDemo: boolean;
}

const CATEGORY_BIN_MAP: Record<WasteCategory, string> = {
  Plastic: 'Blue',
  Organic: 'Green',
  Metal: 'Black/Grey',
  Fabric: 'Yellow',
  'E-Waste': 'Orange',
};

interface ImageFeatures {
  avgR: number;
  avgG: number;
  avgB: number;
  brightness: number;
  saturation: number;
  colorfulness: number;
  edgeDensity: number;
  edgeStrength: number;
  textureVariance: number;
  textureRoughness: number;
  transparencyRatio: number;
  colorHistogram: Record<string, number>;
  regionVariance: number;
  aspectRatio: number;
  warmColorRatio: number;
  coolColorRatio: number;
  neutralColorRatio: number;
  highContrastRatio: number;
  greenDominance: number;
  brownDominance: number;
  blueDominance: number;
  grayDominance: number;
  vibrantColorRatio: number;
}

async function extractImageFeatures(imageUrl: string): Promise<ImageFeatures> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const targetSize = 160;
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Cannot get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, targetSize, targetSize);
      const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
      const pixels = imageData.data;
      const numPixels = pixels.length / 4;

      let totalR = 0, totalG = 0, totalB = 0;
      let totalBrightness = 0;
      let totalSat = 0;
      let totalColorfulness = 0;
      let transparentCount = 0;
      let warmCount = 0;
      let coolCount = 0;
      let neutralCount = 0;
      let highContrastCount = 0;
      let greenDomCount = 0;
      let brownDomCount = 0;
      let blueDomCount = 0;
      let grayDomCount = 0;
      let vibrantCount = 0;

      const grays: number[] = [];
      const colorHistogram: Record<string, number> = {};

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];

        totalR += r;
        totalG += g;
        totalB += b;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const brightness = (max + min) / 2;
        totalBrightness += brightness;

        const sat = max === 0 ? 0 : (max - min) / max;
        totalSat += sat;

        const colorfulness = Math.sqrt(r * r * 0.299 + g * g * 0.587 + b * b * 0.114) - brightness;
        totalColorfulness += Math.abs(colorfulness);

        if (a < 200) transparentCount++;

        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        grays.push(gray);

        // Color category counting
        if (sat > 0.15) {
          if (g > r && g > b) greenDomCount++;
          else if (r > g && r > b && r > 100) {
            if (g > b * 0.7) brownDomCount++;
          }
          else if (b > r && b > g) blueDomCount++;
          else vibrantCount++;
        } else {
          grayDomCount++;
        }

        // Warm vs cool
        if (r > b + 20) warmCount++;
        else if (b > r + 20) coolCount++;
        else neutralCount++;

        if (max - min > 100) highContrastCount++;

        // Color histogram bucket
        const bucket = `${Math.floor(r / 64)}${Math.floor(g / 64)}${Math.floor(b / 64)}`;
        colorHistogram[bucket] = (colorHistogram[bucket] || 0) + 1;
      }

      const avgR = totalR / numPixels;
      const avgG = totalG / numPixels;
      const avgB = totalB / numPixels;
      const brightness = totalBrightness / numPixels;
      const saturation = totalSat / numPixels;
      const colorfulness = totalColorfulness / numPixels;
      const transparencyRatio = transparentCount / numPixels;

      // Edge detection using Sobel-like gradient
      let edgeCount = 0;
      let totalEdgeStrength = 0;
      for (let y = 1; y < targetSize - 1; y++) {
        for (let x = 1; x < targetSize - 1; x++) {
          const idx = (y * targetSize + x) * 4;
          const idxR = (y * targetSize + (x + 1)) * 4;
          const idxD = ((y + 1) * targetSize + x) * 4;
          const idxL = (y * targetSize + (x - 1)) * 4;
          const idxU = ((y - 1) * targetSize + x) * 4;

          const gHere = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
          const gR = 0.299 * pixels[idxR] + 0.587 * pixels[idxR + 1] + 0.114 * pixels[idxR + 2];
          const gD = 0.299 * pixels[idxD] + 0.587 * pixels[idxD + 1] + 0.114 * pixels[idxD + 2];
          const gL = 0.299 * pixels[idxL] + 0.587 * pixels[idxL + 1] + 0.114 * pixels[idxL + 2];
          const gU = 0.299 * pixels[idxU] + 0.587 * pixels[idxU + 1] + 0.114 * pixels[idxU + 2];

          const gx = gR - gL;
          const gy = gD - gU;
          const gradient = Math.sqrt(gx * gx + gy * gy);

          if (gradient > 25) {
            edgeCount++;
            totalEdgeStrength += gradient;
          }
        }
      }
      const edgeDensity = edgeCount / (targetSize * targetSize);
      const edgeStrength = edgeCount > 0 ? totalEdgeStrength / edgeCount : 0;

      // Texture variance and roughness
      let grayMean = 0;
      for (const g of grays) grayMean += g;
      grayMean /= grays.length;
      let grayVar = 0;
      for (const g of grays) grayVar += (g - grayMean) * (g - grayMean);
      grayVar /= grays.length;
      const textureVariance = Math.sqrt(grayVar);

      // Local texture roughness: average local standard deviation in 8x8 blocks
      let roughnessSum = 0;
      let blockCount = 0;
      const blockSize = 8;
      for (let by = 0; by < targetSize; by += blockSize) {
        for (let bx = 0; bx < targetSize; bx += blockSize) {
          let blockMean = 0;
          let blockCount2 = 0;
          for (let dy = 0; dy < blockSize && by + dy < targetSize; dy++) {
            for (let dx = 0; dx < blockSize && bx + dx < targetSize; dx++) {
              blockMean += grays[(by + dy) * targetSize + (bx + dx)];
              blockCount2++;
            }
          }
          blockMean /= blockCount2;
          let blockVar = 0;
          for (let dy = 0; dy < blockSize && by + dy < targetSize; dy++) {
            for (let dx = 0; dx < blockSize && bx + dx < targetSize; dx++) {
              const v = grays[(by + dy) * targetSize + (bx + dx)] - blockMean;
              blockVar += v * v;
            }
          }
          roughnessSum += Math.sqrt(blockVar / blockCount2);
          blockCount++;
        }
      }
      const textureRoughness = blockCount > 0 ? roughnessSum / blockCount : 0;

      // Region variance: how different are the 4 quadrants
      const quadrantMeans: number[] = [];
      for (let qy = 0; qy < 2; qy++) {
        for (let qx = 0; qx < 2; qx++) {
          let qSum = 0;
          let qCount = 0;
          const startY = qy * (targetSize / 2);
          const startX = qx * (targetSize / 2);
          const endY = startY + targetSize / 2;
          const endX = startX + targetSize / 2;
          for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
              qSum += grays[y * targetSize + x];
              qCount++;
            }
          }
          quadrantMeans.push(qSum / qCount);
        }
      }
      let regionVar = 0;
      const qMean = quadrantMeans.reduce((s, v) => s + v, 0) / quadrantMeans.length;
      for (const qm of quadrantMeans) regionVar += (qm - qMean) * (qm - qMean);
      regionVar /= quadrantMeans.length;
      const regionVariance = Math.sqrt(regionVar);

      const aspectRatio = img.naturalWidth / (img.naturalHeight || 1);

      resolve({
        avgR, avgG, avgB,
        brightness, saturation, colorfulness,
        edgeDensity, edgeStrength, textureVariance, textureRoughness,
        transparencyRatio,
        colorHistogram,
        regionVariance,
        aspectRatio,
        warmColorRatio: warmCount / numPixels,
        coolColorRatio: coolCount / numPixels,
        neutralColorRatio: neutralCount / numPixels,
        highContrastRatio: highContrastCount / numPixels,
        greenDominance: greenDomCount / numPixels,
        brownDominance: brownDomCount / numPixels,
        blueDominance: blueDomCount / numPixels,
        grayDominance: grayDomCount / numPixels,
        vibrantColorRatio: vibrantCount / numPixels,
      });
    };
    img.onerror = () => reject(new Error('Failed to load image for analysis'));
    img.src = imageUrl;
  });
}

function classifyFromFeatures(f: ImageFeatures): { category: WasteCategory; confidence: number } {
  const scores: Record<WasteCategory, number> = {
    Plastic: 0,
    Organic: 0,
    Metal: 0,
    Fabric: 0,
    'E-Waste': 0,
  };

  // === PLASTIC ===
  // Bright, saturated, smooth surface, uniform color, moderate edges
  // Plastic items: bottles, containers, bags - glossy, bright, colorful
  scores.Plastic =
    f.saturation * 0.25 +
    (f.brightness / 255) * 0.15 +
    (1 - Math.min(f.textureRoughness / 40, 1)) * 0.2 +
    (1 - Math.min(f.edgeDensity * 4, 1)) * 0.15 +
    f.vibrantColorRatio * 0.15 +
    (f.colorfulness / 50) * 0.1;

  // === ORGANIC ===
  // Green/brown tones, high saturation in warm direction, low edges, natural texture
  // Food waste, leaves, plant matter - earthy colors, organic shapes
  scores.Organic =
    (f.greenDominance + f.brownDominance) * 0.35 +
    f.saturation * 0.15 +
    (1 - Math.min(f.edgeDensity * 3, 1)) * 0.15 +
    (1 - Math.min(f.textureRoughness / 50, 1)) * 0.1 +
    f.warmColorRatio * 0.1 +
    (1 - f.brightness / 510) * 0.15;

  // === METAL ===
  // High brightness, low saturation, high edge density, gray/neutral, sharp edges
  // Cans, foil, wire - shiny, reflective, hard edges
  scores.Metal =
    (f.brightness / 255) * 0.2 +
    (1 - f.saturation) * 0.2 +
    Math.min(f.edgeDensity * 3, 1) * 0.2 +
    (f.edgeStrength / 100) * 0.1 +
    f.grayDominance * 0.15 +
    (1 - Math.min(f.textureRoughness / 30, 1)) * 0.15;

  // === FABRIC ===
  // High texture roughness, moderate saturation, soft edges, mid brightness
  // Cloth, textiles, denim - woven texture, soft folds
  scores.Fabric =
    Math.min(f.textureRoughness / 35, 1) * 0.3 +
    Math.min(f.textureVariance / 70, 1) * 0.2 +
    f.saturation * 0.1 +
    (1 - Math.min(f.edgeDensity * 2.5, 1)) * 0.15 +
    (1 - Math.abs(f.brightness - 128) / 128) * 0.15 +
    (1 - Math.min(f.edgeStrength / 80, 1)) * 0.1;

  // === E-WASTE ===
  // Very high edge density, high complexity, dark, high contrast, circuit-like
  // Circuit boards, batteries, electronics - complex, dark, many sharp edges
  scores['E-Waste'] =
    Math.min(f.edgeDensity * 2.5, 1) * 0.25 +
    Math.min(f.textureRoughness / 45, 1) * 0.2 +
    f.highContrastRatio * 0.2 +
    (1 - f.brightness / 340) * 0.15 +
    (1 - f.saturation) * 0.1 +
    Math.min(f.regionVariance / 60, 1) * 0.1;

  const entries = Object.entries(scores) as [WasteCategory, number][];
  entries.sort((a, b) => b[1] - a[1]);

  const winner = entries[0];
  const runnerUp = entries[1];
  const total = entries.reduce((s, [, v]) => s + v, 0);

  // Confidence: dominance of winner + margin over runner-up
  const dominance = total > 0 ? winner[1] / total : 0;
  const margin = winner[1] - runnerUp[1];
  const rawConfidence = dominance * 55 + margin * 120;
  const confidence = Math.round(Math.min(96, Math.max(50, rawConfidence)) * 100) / 100;

  return { category: winner[0], confidence };
}

export async function predictWaste(imageUrl: string, _threshold: number = 70): Promise<PredictionResult> {
  const features = await extractImageFeatures(imageUrl);
  const { category, confidence } = classifyFromFeatures(features);

  return {
    category,
    confidence,
    recommendedBin: CATEGORY_BIN_MAP[category],
    isDemo: false,
  };
}

export async function predictWasteFromImage(
  imageFile: File,
  threshold: number = 70,
): Promise<PredictionResult & { imageUrl: string }> {
  const imageUrl = URL.createObjectURL(imageFile);

  const features = await extractImageFeatures(imageUrl);
  const { category, confidence } = classifyFromFeatures(features);

  return {
    category,
    confidence,
    recommendedBin: CATEGORY_BIN_MAP[category],
    isDemo: false,
    imageUrl,
  };
}

export function getBinColor(category: WasteCategory): string {
  return CATEGORY_BIN_MAP[category];
}

export function getConfidenceStatus(confidence: number, threshold: number = 70): 'High' | 'Low' {
  return confidence >= threshold ? 'High' : 'Low';
}
