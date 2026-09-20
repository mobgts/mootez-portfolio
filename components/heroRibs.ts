const POS_X = 0.68;
const POS_Y = 0.5;

export type HeroStrip = {
  left: number;
  width: number;
};

function columnDarkness(data: Uint8ClampedArray, w: number, h: number) {
  const signal = new Float64Array(w);
  const y0 = Math.floor(h * 0.18);
  const y1 = Math.floor(h * 0.82);

  for (let x = 0; x < w; x++) {
    let sum = 0;
    let count = 0;
    for (let y = y0; y < y1; y++) {
      const i = (y * w + x) * 4;
      sum += Math.min(data[i], data[i + 1], data[i + 2]);
      count++;
    }
    signal[x] = sum / count;
  }

  return signal;
}

function smooth(signal: Float64Array, radius: number) {
  const out = new Float64Array(signal.length);
  for (let x = 0; x < signal.length; x++) {
    let sum = 0;
    let count = 0;
    for (let k = x - radius; k <= x + radius; k++) {
      if (k < 0 || k >= signal.length) continue;
      sum += signal[k];
      count++;
    }
    out[x] = sum / count;
  }
  return out;
}

function estimatePeriod(signal: Float64Array) {
  const n = signal.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += signal[i];
  mean /= n;

  const minLag = 10;
  const maxLag = Math.min(56, Math.floor(n / 20));
  let bestLag = minLag;
  let best = -Infinity;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let score = 0;
    for (let i = 0; i < n - lag; i++) {
      score += (signal[i] - mean) * (signal[i + lag] - mean);
    }
    if (score > best) {
      best = score;
      bestLag = lag;
    }
  }

  return bestLag;
}

function localMinima(signal: Float64Array, minDist: number) {
  const out: number[] = [];

  for (let x = 2; x < signal.length - 2; x++) {
    if (
      signal[x] <= signal[x - 1] &&
      signal[x] <= signal[x + 1] &&
      signal[x] < signal[x - 2] &&
      signal[x] < signal[x + 2]
    ) {
      const prev = out[out.length - 1];
      if (prev === undefined || x - prev >= minDist) {
        out.push(x);
      } else if (signal[x] < signal[prev]) {
        out[out.length - 1] = x;
      }
    }
  }

  return out;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  w: number,
  h: number,
) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  const dx = (w - dw) * POS_X;
  const dy = (h - dh) * POS_Y;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(image, dx, dy, dw, dh);
}

export function layoutStrips(
  image: HTMLImageElement,
  boxW: number,
  boxH: number,
): { strips: HeroStrip[]; heroW: number; heroH: number } | null {
  try {
    const heroW = Math.max(1, Math.round(boxW));
    const heroH = Math.max(1, Math.round(boxH));
    if (heroW < 80 || heroH < 80) return null;

    const canvas = document.createElement("canvas");
    canvas.width = heroW;
    canvas.height = heroH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    drawCover(ctx, image, heroW, heroH);
    const { data } = ctx.getImageData(0, 0, heroW, heroH);
    const blurred = smooth(columnDarkness(data, heroW, heroH), 2);
    const period = estimatePeriod(blurred);
    const seams = localMinima(blurred, Math.max(8, Math.round(period * 0.55)));
    if (seams.length < 8) return null;

    const edges = [0];
    for (const seam of seams) {
      if (seam > 2 && seam < heroW - 2) edges.push(seam);
    }
    edges.push(heroW);

    const strips: HeroStrip[] = [];
    for (let i = 0; i < edges.length - 1; i++) {
      const left = edges[i];
      const width = edges[i + 1] - left;
      if (width < 2) continue;
      strips.push({ left, width });
    }

    return strips.length > 8 ? { strips, heroW, heroH } : null;
  } catch {
    return null;
  }
}
