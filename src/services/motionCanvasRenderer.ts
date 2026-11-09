// ToolsOnDesk Motion Canvas Renderer
// Shared 60 FPS deterministic canvas drawing engine for preview and export parity

import { MotionComposition, MotionLayer } from '../types/creative';

// Easing functions
export function calculateEasing(t: number, easing?: string): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (easing) {
    case 'ease_in':
      return clamped * clamped;
    case 'ease_out':
      return 1 - Math.pow(1 - clamped, 3);
    case 'ease_in_out':
      return clamped < 0.5
        ? 4 * clamped * clamped * clamped
        : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
    case 'spring':
    case 'bounce': {
      const c4 = (2 * Math.PI) / 3;
      return clamped === 0
        ? 0
        : clamped === 1
        ? 1
        : Math.pow(2, -10 * clamped) * Math.sin((clamped * 10 - 0.75) * c4) + 1;
    }
    case 'linear':
    default:
      return clamped;
  }
}

// Global image cache for canvas rendering (browser & headless)
const imageCache: Map<string, HTMLImageElement> = new Map();

export function preloadImage(src: string, dataUri?: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src)!);
  }
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      return reject(new Error('Image constructor not available'));
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      if (dataUri) imageCache.set(dataUri, img);
      resolve(img);
    };
    img.onerror = (e) => {
      console.warn('Failed to load image:', src, e);
      resolve(img);
    };
    img.src = dataUri || src;
  });
}

// Helper to draw rounded rectangle with cross-environment fallback
export function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number | number[] = 8
) {
  const r = typeof radius === 'number' ? radius : radius[0] || 8;
  const clampedR = Math.min(r, Math.min(w / 2, h / 2));
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, clampedR);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + clampedR, y);
    ctx.lineTo(x + w - clampedR, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + clampedR);
    ctx.lineTo(x + w, y + h - clampedR);
    ctx.quadraticCurveTo(x + w, y + h, x + w - clampedR, y + h);
    ctx.lineTo(x + clampedR, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - clampedR);
    ctx.lineTo(x, y + clampedR);
    ctx.quadraticCurveTo(x, y, x + clampedR, y);
    ctx.closePath();
  }
}

// Draw a glowing border or stroke
export function strokeGlow(
  ctx: CanvasRenderingContext2D,
  color: string,
  lineWidth: number = 2,
  blur: number = 8
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.stroke();
  ctx.restore();
}

// Component 1: AnimatedGrid
function renderAnimatedGrid(
  ctx: CanvasRenderingContext2D,
  layer: MotionLayer,
  x: number,
  y: number,
  w: number,
  h: number,
  _progress: number,
  sceneTime: number
) {
  ctx.save();
  const cols = 12;
  const rows = 8;
  const cellW = w / cols;
  const cellH = h / rows;

  ctx.strokeStyle = layer.color || 'rgba(31, 41, 43, 0.6)';
  ctx.lineWidth = 1;

  for (let c = 0; c <= cols; c++) {
    const gx = x + c * cellW;
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + h);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    const gy = y + r * cellH;
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
    ctx.stroke();
  }

  // Active pulsing intersection points
  const activeCol = Math.floor((sceneTime * 2) % cols);
  for (let r = 0; r < rows; r++) {
    const px = x + activeCol * cellW;
    const py = y + r * cellH;
    ctx.fillStyle = '#15F5BA';
    ctx.shadowColor = '#15F5BA';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Component 2: AnimatedArray
function renderAnimatedArray(
  ctx: CanvasRenderingContext2D,
  layer: MotionLayer,
  x: number,
  y: number,
  w: number,
  h: number,
  _progress: number,
  sceneTime: number
) {
  ctx.save();
  let items = [1, 4, 7, 12, 19, 28, 42, 65];
  try {
    if (layer.content && layer.content.startsWith('[')) {
      items = JSON.parse(layer.content);
    }
  } catch {}

  const cellCount = items.length;
  const gap = 10;
  const totalGaps = (cellCount - 1) * gap;
  const boxW = Math.max(36, (w - totalGaps) / cellCount);
  const boxH = Math.min(boxW * 1.1, h * 0.7);

  // Determine active index based on mode or time
  let activeIndex = 0;
  const mode = layer.name.toLowerCase();
  if (mode.includes('o(1)') || mode.includes('constant')) {
    activeIndex = 3; // O(1) direct access
  } else if (mode.includes('log') || mode.includes('binary')) {
    // Binary search halving: starts middle, then subdivides
    const step = Math.floor(sceneTime * 1.5) % 3;
    activeIndex = step === 0 ? 3 : step === 1 ? 5 : 6;
  } else {
    // Linear scan
    activeIndex = Math.min(cellCount - 1, Math.floor(sceneTime * 2.5) % cellCount);
  }

  for (let i = 0; i < cellCount; i++) {
    const bx = x + i * (boxW + gap);
    const by = y + (h - boxH) / 2;
    const isActive = i === activeIndex;

    // Box background
    ctx.save();
    drawRoundRect(ctx, bx, by, boxW, boxH, 8);
    if (isActive) {
      ctx.fillStyle = '#15F5BA';
      ctx.shadowColor = '#15F5BA';
      ctx.shadowBlur = 16;
    } else {
      ctx.fillStyle = '#141A1C';
    }
    ctx.fill();

    // Box border
    ctx.strokeStyle = isActive ? '#15F5BA' : '#1F292B';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.stroke();
    ctx.restore();

    // Value text
    ctx.fillStyle = isActive ? '#0B0F10' : '#F3F4F6';
    ctx.font = `bold ${Math.round(boxH * 0.42)}px 'Geist Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(items[i]), bx + boxW / 2, by + boxH / 2);

    // Index label below
    ctx.fillStyle = isActive ? '#15F5BA' : '#9AA6A8';
    ctx.font = `500 ${Math.round(boxH * 0.22)}px 'Geist Mono', monospace`;
    ctx.fillText(`[${i}]`, bx + boxW / 2, by + boxH + 18);

    // Active pointer arrow
    if (isActive) {
      ctx.fillStyle = '#15F5BA';
      const arrowY = by - 10;
      ctx.beginPath();
      ctx.moveTo(bx + boxW / 2, arrowY);
      ctx.lineTo(bx + boxW / 2 - 6, arrowY - 10);
      ctx.lineTo(bx + boxW / 2 + 6, arrowY - 10);
      ctx.closePath();
      ctx.fill();

      // Label above arrow
      ctx.font = `bold 12px 'Geist Mono', monospace`;
      ctx.fillText(`arr[${i}]`, bx + boxW / 2, arrowY - 16);
    }
  }
  ctx.restore();
}

// Component 3: AnimatedChart
function renderAnimatedChart(
  ctx: CanvasRenderingContext2D,
  _layer: MotionLayer,
  x: number,
  y: number,
  w: number,
  h: number,
  progress: number,
  _sceneTime: number
) {
  ctx.save();
  // Chart background
  drawRoundRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = 'rgba(20, 26, 28, 0.85)';
  ctx.fill();
  ctx.strokeStyle = '#1F292B';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Axes
  const pad = 48;
  const originX = x + pad;
  const originY = y + h - pad;
  const plotW = w - pad * 2;
  const plotH = h - pad * 2;

  ctx.strokeStyle = '#9AA6A8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(originX, y + pad / 2);
  ctx.lineTo(originX, originY);
  ctx.lineTo(originX + plotW, originY);
  ctx.stroke();

  // Axis Labels
  ctx.fillStyle = '#9AA6A8';
  ctx.font = `11px 'Geist Mono', monospace`;
  ctx.textAlign = 'right';
  ctx.fillText('Operations (Time)', originX + 110, y + pad / 2 - 6);
  ctx.textAlign = 'center';
  ctx.fillText('Input Size (N) →', originX + plotW / 2, originY + 28);

  // Draw curves up to animated progress
  const drawProg = Math.min(1.0, progress * 1.2);
  const steps = 60;
  const activeSteps = Math.floor(steps * drawProg);

  // 1. O(1) - Constant (Mint Green)
  ctx.save();
  ctx.strokeStyle = '#15F5BA';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#15F5BA';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  for (let s = 0; s <= activeSteps; s++) {
    const tNorm = s / steps;
    const cx = originX + tNorm * plotW;
    const cy = originY - 24; // flat low
    if (s === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.restore();

  // 2. O(log n) - Logarithmic (Cyan)
  ctx.save();
  ctx.strokeStyle = '#00D2FF';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let s = 0; s <= activeSteps; s++) {
    const tNorm = s / steps;
    const cx = originX + tNorm * plotW;
    const cy = originY - Math.log(1 + tNorm * 15) * (plotH * 0.25);
    if (s === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.restore();

  // 3. O(n) - Linear (Yellow)
  ctx.save();
  ctx.strokeStyle = '#FFC107';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let s = 0; s <= activeSteps; s++) {
    const tNorm = s / steps;
    const cx = originX + tNorm * plotW;
    const cy = originY - tNorm * (plotH * 0.65);
    if (s === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.restore();

  // 4. O(n²) - Quadratic (Red)
  ctx.save();
  ctx.strokeStyle = '#FF4D4D';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let s = 0; s <= activeSteps; s++) {
    const tNorm = s / steps;
    const cx = originX + tNorm * plotW;
    const cy = originY - Math.pow(tNorm, 2) * (plotH * 0.95);
    if (s === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.restore();

  // Legend badges in top right
  const legends = [
    { label: 'O(1)', color: '#15F5BA' },
    { label: 'O(log n)', color: '#00D2FF' },
    { label: 'O(n)', color: '#FFC107' },
    { label: 'O(n²)', color: '#FF4D4D' },
  ];
  let legX = originX + plotW - 20;
  for (let i = legends.length - 1; i >= 0; i--) {
    const leg = legends[i];
    ctx.font = `bold 12px 'Geist Mono', monospace`;
    ctx.fillStyle = leg.color;
    ctx.textAlign = 'right';
    ctx.fillText(leg.label, legX, y + pad + (legends.length - 1 - i) * 22);
    ctx.fillStyle = leg.color;
    ctx.fillRect(legX + 6, y + pad + (legends.length - 1 - i) * 22 - 9, 8, 8);
  }

  ctx.restore();
}

// Component 4: ProgressCounter
function renderProgressCounter(
  ctx: CanvasRenderingContext2D,
  layer: MotionLayer,
  x: number,
  y: number,
  w: number,
  h: number,
  progress: number
) {
  ctx.save();
  drawRoundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = layer.background_color || '#141A1C';
  ctx.fill();
  ctx.strokeStyle = layer.border_color || '#15F5BA';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  let targetVal = 100;
  let prefix = 'N = ';
  let suffix = '';
  if (layer.content) {
    if (layer.content.includes(':')) {
      const parts = layer.content.split(':');
      prefix = parts[0] + ': ';
      targetVal = parseFloat(parts[1]) || 100;
    } else {
      targetVal = parseFloat(layer.content) || 100;
    }
  }

  const currentVal = Math.round(targetVal * progress);
  ctx.fillStyle = layer.color || '#15F5BA';
  ctx.font = `bold ${Math.round(h * 0.45)}px 'Geist Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${prefix}${currentVal}${suffix}`, x + w / 2, y + h / 2);
  ctx.restore();
}

// Component 5: AnimatedBar
function renderAnimatedBar(
  ctx: CanvasRenderingContext2D,
  layer: MotionLayer,
  x: number,
  y: number,
  w: number,
  h: number,
  progress: number
) {
  ctx.save();
  // Background track
  drawRoundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = '#141A1C';
  ctx.fill();
  ctx.strokeStyle = '#1F292B';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Filled progress
  const fillW = Math.max(h, w * progress);
  drawRoundRect(ctx, x, y, fillW, h, h / 2);
  const grad = ctx.createLinearGradient(x, y, x + fillW, y);
  grad.addColorStop(0, '#076B39');
  grad.addColorStop(1, '#15F5BA');
  ctx.fillStyle = grad;
  ctx.shadowColor = '#15F5BA';
  ctx.shadowBlur = 10;
  ctx.fill();

  // Text label
  if (layer.content) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0B0F10';
    ctx.font = `bold ${Math.round(h * 0.55)}px 'Geist Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${layer.content} (${Math.round(progress * 100)}%)`, x + fillW / 2, y + h / 2);
  }
  ctx.restore();
}

// Component 6: DiagramNode
function renderDiagramNode(
  ctx: CanvasRenderingContext2D,
  layer: MotionLayer,
  x: number,
  y: number,
  w: number,
  h: number,
  _progress: number
) {
  ctx.save();
  drawRoundRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = layer.background_color || '#141A1C';
  ctx.fill();

  ctx.strokeStyle = layer.border_color || '#15F5BA';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Status indicator dot
  ctx.fillStyle = '#15F5BA';
  ctx.shadowColor = '#15F5BA';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(x + 20, y + 22, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Title
  ctx.fillStyle = '#F3F4F6';
  ctx.font = `bold 16px 'Geist', sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(layer.name || 'Diagram Node', x + 34, y + 22);

  // Content / subtitle
  if (layer.content) {
    ctx.fillStyle = '#9AA6A8';
    ctx.font = `13px 'Geist Mono', monospace`;
    ctx.fillText(layer.content, x + 20, y + h - 22);
  }
  ctx.restore();
}

// Component 7: AnimatedConnector
function renderAnimatedConnector(
  ctx: CanvasRenderingContext2D,
  layer: MotionLayer,
  x: number,
  y: number,
  w: number,
  h: number,
  progress: number,
  sceneTime: number
) {
  ctx.save();
  const startX = x;
  const startY = y + h / 2;
  const endX = x + w * progress;
  const endY = y + h / 2;

  ctx.strokeStyle = layer.color || '#15F5BA';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -sceneTime * 30;
  ctx.shadowColor = layer.color || '#15F5BA';
  ctx.shadowBlur = 8;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Flowing pulse particle
  const pulseX = startX + ((sceneTime * 120) % Math.max(1, w));
  if (pulseX <= endX) {
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(pulseX, startY, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Component 8: FeatureCard
function renderFeatureCard(
  ctx: CanvasRenderingContext2D,
  layer: MotionLayer,
  x: number,
  y: number,
  w: number,
  h: number,
  _progress: number
) {
  ctx.save();
  drawRoundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = layer.background_color || '#141A1C';
  ctx.fill();

  ctx.strokeStyle = layer.border_color || '#1F292B';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Mint top accent line
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + 14, y);
  ctx.lineTo(x + w - 14, y);
  ctx.strokeStyle = '#15F5BA';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#15F5BA';
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.restore();

  // Icon Badge
  const badgeSize = 36;
  drawRoundRect(ctx, x + 20, y + 20, badgeSize, badgeSize, 8);
  ctx.fillStyle = 'rgba(21, 245, 186, 0.12)';
  ctx.fill();
  ctx.strokeStyle = '#15F5BA';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Icon symbol
  ctx.fillStyle = '#15F5BA';
  ctx.font = `bold 16px 'Geist Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡', x + 20 + badgeSize / 2, y + 20 + badgeSize / 2);

  // Title
  ctx.fillStyle = '#F3F4F6';
  ctx.font = `bold 18px 'Geist', sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(layer.name || 'Feature', x + 20, y + 70);

  // Description
  ctx.fillStyle = '#9AA6A8';
  ctx.font = `13px 'Geist', sans-serif`;
  const desc = layer.content || 'Fast local creative workflows without cloud dependencies.';
  ctx.fillText(desc, x + 20, y + 98);
  ctx.restore();
}

// Component 9: ScreenshotShowcase
function renderScreenshotShowcase(
  ctx: CanvasRenderingContext2D,
  layer: MotionLayer,
  x: number,
  y: number,
  w: number,
  h: number,
  _progress: number
) {
  ctx.save();
  // Window container
  drawRoundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = '#0B0F10';
  ctx.fill();
  ctx.strokeStyle = 'rgba(21, 245, 186, 0.4)';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 24;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Window titlebar
  const headerH = 36;
  drawRoundRect(ctx, x, y, w, headerH, [14, 14, 0, 0]);
  ctx.fillStyle = '#141A1C';
  ctx.fill();
  ctx.strokeStyle = '#1F292B';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Traffic lights
  const dots = ['#FF5F56', '#FFBD2E', '#27C93F'];
  dots.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + 20 + i * 16, y + headerH / 2, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Window title
  ctx.fillStyle = '#9AA6A8';
  ctx.font = `12px 'Geist Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ToolsOnDesk — Workspace', x + w / 2, y + headerH / 2);

  // Window content: screenshot image or realistic UI mockup
  const viewY = y + headerH;
  const viewH = h - headerH;
  const cachedImg = layer.content ? imageCache.get(layer.content) : null;
  if (cachedImg) {
    ctx.drawImage(cachedImg, x, viewY, w, viewH);
  } else {
    // Elegant interface illustration
    ctx.fillStyle = '#0E1315';
    ctx.fillRect(x + 1, viewY, w - 2, viewH - 2);

    // Sidebar
    ctx.fillStyle = '#141A1C';
    ctx.fillRect(x + 1, viewY, 70, viewH - 2);

    // Canvas work area
    ctx.fillStyle = '#161E21';
    drawRoundRect(ctx, x + 90, viewY + 20, w - 120, viewH - 40, 8);
    ctx.fill();

    ctx.fillStyle = '#15F5BA';
    ctx.font = `bold 16px 'Geist', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ToolsOnDesk Studio Interface', x + w / 2, viewY + viewH / 2);
  }
  ctx.restore();
}

// Component 10: LogoReveal
function renderLogoReveal(
  ctx: CanvasRenderingContext2D,
  layer: MotionLayer,
  x: number,
  y: number,
  w: number,
  h: number,
  progress: number,
  sceneTime: number
) {
  ctx.save();
  const centerX = x + w / 2;
  const centerY = y + h / 2 - 20;
  const size = Math.min(w, h) * 0.28 * Math.min(1, progress * 1.2);

  // Rotating outer ring
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(sceneTime * 0.8);
  ctx.strokeStyle = 'rgba(21, 245, 186, 0.4)';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, size * 1.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Core geometric hexagonal badge
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const hx = Math.cos(angle) * size;
    const hy = Math.sin(angle) * size;
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.fillStyle = '#141A1C';
  ctx.fill();
  ctx.strokeStyle = '#15F5BA';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#15F5BA';
  ctx.shadowBlur = 18;
  ctx.stroke();

  // Inner logo content: preloaded image or stylized glyph
  const cachedLogo = layer.content ? imageCache.get(layer.content) : null;
  if (cachedLogo) {
    const logoW = size * 1.2;
    const logoH = size * 1.2;
    ctx.drawImage(cachedLogo, -logoW / 2, -logoH / 2, logoW, logoH);
  } else {
    ctx.fillStyle = '#15F5BA';
    ctx.shadowBlur = 10;
    ctx.fillRect(-size * 0.5, -size * 0.35, size, size * 0.2);
    ctx.fillRect(-size * 0.12, -size * 0.15, size * 0.24, size * 0.6);
  }
  ctx.restore();

  // Brand title below
  ctx.fillStyle = '#F3F4F6';
  ctx.font = `bold 32px 'Geist', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('ToolsOnDesk', centerX, centerY + size + 24);

  ctx.fillStyle = '#15F5BA';
  ctx.font = `500 14px 'Geist Mono', monospace`;
  ctx.fillText('CREATIVE STUDIO & AI WORKFLOWS', centerX, centerY + size + 64);
  ctx.restore();
}

// Component 11: ShapeReveal
function renderShapeReveal(
  ctx: CanvasRenderingContext2D,
  layer: MotionLayer,
  x: number,
  y: number,
  w: number,
  h: number,
  progress: number
) {
  ctx.save();
  const shapeW = w * progress;
  const shapeH = h * progress;
  const rx = x + (w - shapeW) / 2;
  const ry = y + (h - shapeH) / 2;

  drawRoundRect(ctx, rx, ry, shapeW, shapeH, layer.border_radius || 16);
  ctx.fillStyle = layer.color || '#15F5BA';
  ctx.shadowColor = layer.color || '#15F5BA';
  ctx.shadowBlur = 20 * progress;
  ctx.fill();

  if (layer.content) {
    ctx.fillStyle = '#0B0F10';
    ctx.font = `bold ${Math.round(shapeH * 0.4)}px 'Geist', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(layer.content, rx + shapeW / 2, ry + shapeH / 2);
  }
  ctx.restore();
}

// Component 12: ComparisonChart
function renderComparisonChart(
  ctx: CanvasRenderingContext2D,
  _layer: MotionLayer,
  x: number,
  y: number,
  w: number,
  h: number,
  progress: number
) {
  ctx.save();
  // Card base
  drawRoundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = '#141A1C';
  ctx.fill();
  ctx.strokeStyle = '#1F292B';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Items to compare
  const items = [
    { name: 'O(1)', ops: '1 op', heightRate: 0.1, color: '#15F5BA', speed: 'Execellente' },
    { name: 'O(log n)', ops: '7 ops', heightRate: 0.28, color: '#00D2FF', speed: 'Rápido' },
    { name: 'O(n)', ops: '100 ops', heightRate: 0.55, color: '#FFC107', speed: 'Linear' },
    { name: 'O(n²)', ops: '10,000 ops', heightRate: 0.95, color: '#FF4D4D', speed: 'Lento' },
  ];

  const colW = (w - 40) / items.length;
  const chartBottom = y + h - 45;
  const maxBarH = h - 110;

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const bx = x + 20 + i * colW;
    const barW = colW * 0.65;
    const barX = bx + (colW - barW) / 2;
    const currentBarH = maxBarH * it.heightRate * progress;
    const barY = chartBottom - currentBarH;

    // Bar
    drawRoundRect(ctx, barX, barY, barW, currentBarH, 6);
    ctx.fillStyle = it.color;
    ctx.shadowColor = it.color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Metric text on bar top
    ctx.fillStyle = it.color;
    ctx.font = `bold 12px 'Geist Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(it.ops, barX + barW / 2, barY - 10);

    // Label below
    ctx.fillStyle = '#F3F4F6';
    ctx.font = `bold 14px 'Geist Mono', monospace`;
    ctx.fillText(it.name, barX + barW / 2, chartBottom + 18);

    // Speed tag
    ctx.fillStyle = '#9AA6A8';
    ctx.font = `11px 'Geist', sans-serif`;
    ctx.fillText(it.speed, barX + barW / 2, chartBottom + 32);
  }
  ctx.restore();
}

// Master frame renderer function
export function renderMotionCanvasFrame(
  ctx: CanvasRenderingContext2D,
  composition: MotionComposition,
  timeSec: number,
  viewportW?: number,
  viewportH?: number
) {
  const w = viewportW || composition.width || 1080;
  const h = viewportH || composition.height || 1080;

  // 1. Clear & Background
  ctx.fillStyle = composition.background_color || '#0B0F10';
  ctx.fillRect(0, 0, w, h);

  // 2. Iterate scenes
  for (const scene of composition.scenes) {
    const sStart = scene.start_time;
    const sEnd = sStart + scene.duration_sec;

    if (timeSec < sStart || timeSec > sEnd) continue;

    const sceneTime = timeSec - sStart;

    // Sort layers by z_index
    const sortedLayers = [...scene.layers].sort((a, b) => a.z_index - b.z_index);

    for (const layer of sortedLayers) {
      const lStart = sStart + layer.start_time;
      const lEnd = lStart + layer.duration_sec;

      if (timeSec < lStart || timeSec > lEnd) continue;

      // Compute animation progress (defaults to layer duration timeline)
      const anim = layer.animation;
      let progress = Math.max(0, Math.min(1, (timeSec - lStart) / Math.max(0.01, layer.duration_sec)));
      if (anim) {
        const animStart = lStart + anim.delay_sec;
        const animDuration = anim.duration_sec || 0.6;
        if (timeSec < animStart) {
          progress = 0;
        } else {
          const rawT = (timeSec - animStart) / Math.max(0.01, animDuration);
          progress = calculateEasing(rawT, anim.easing);
        }
      }

      ctx.save();

      // Transform calculations
      let opacity = layer.opacity !== undefined ? layer.opacity : 1.0;
      let scale = layer.scale !== undefined ? layer.scale : 1.0;
      let xOffset = 0;
      let yOffset = 0;

      if (anim) {
        switch (anim.effect) {
          case 'fade_in':
            opacity *= progress;
            break;
          case 'zoom_in':
            scale *= 0.5 + 0.5 * progress;
            opacity *= Math.min(1, progress * 1.5);
            break;
          case 'slide_up':
            yOffset = (1 - progress) * (h * 0.12);
            opacity *= Math.min(1, progress * 2);
            break;
          case 'slide_down':
            yOffset = -(1 - progress) * (h * 0.12);
            opacity *= Math.min(1, progress * 2);
            break;
          case 'slide_right':
          case 'move_right':
            xOffset = progress * (w * 0.6);
            break;
          case 'slide_left':
          case 'move_left':
            xOffset = -progress * (w * 0.6);
            break;
          case 'bounce':
            scale *= 0.7 + 0.3 * progress;
            break;
          case 'pulse':
            scale *= 0.95 + 0.1 * Math.sin(sceneTime * 8);
            break;
          case 'glow':
            ctx.shadowColor = layer.color || '#15F5BA';
            ctx.shadowBlur = 20 * progress;
            break;
        }
      }

      ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

      const lx = layer.x * w + xOffset;
      const ly = layer.y * h + yOffset;
      const lw = layer.width * w * scale;
      const lh = layer.height * h * scale;

      // Check for component dispatch
      const lType = layer.layer_type.toLowerCase();
      const compType = (layer.component_type || '').toLowerCase();
      const nameLower = (layer.name || '').toLowerCase();

      const isComp = (target: string) =>
        lType === target ||
        compType === target ||
        nameLower === target ||
        nameLower.startsWith(target) ||
        (target === 'featurecard' && (nameLower.includes('feature card') || nameLower.includes('feature')));

      if (isComp('animatedgrid')) {
        renderAnimatedGrid(ctx, layer, lx, ly, lw, lh, progress, sceneTime);
      } else if (isComp('animatedarray')) {
        renderAnimatedArray(ctx, layer, lx, ly, lw, lh, progress, sceneTime);
      } else if (isComp('animatedchart')) {
        renderAnimatedChart(ctx, layer, lx, ly, lw, lh, progress, sceneTime);
      } else if (isComp('progresscounter')) {
        renderProgressCounter(ctx, layer, lx, ly, lw, lh, progress);
      } else if (isComp('animatedbar')) {
        renderAnimatedBar(ctx, layer, lx, ly, lw, lh, progress);
      } else if (isComp('diagramnode')) {
        renderDiagramNode(ctx, layer, lx, ly, lw, lh, progress);
      } else if (isComp('animatedconnector')) {
        renderAnimatedConnector(ctx, layer, lx, ly, lw, lh, progress, sceneTime);
      } else if (isComp('featurecard')) {
        renderFeatureCard(ctx, layer, lx, ly, lw, lh, progress);
      } else if (isComp('screenshotshowcase')) {
        renderScreenshotShowcase(ctx, layer, lx, ly, lw, lh, progress);
      } else if (isComp('logoreveal')) {
        renderLogoReveal(ctx, layer, lx, ly, lw, lh, progress, sceneTime);
      } else if (isComp('shapereveal')) {
        renderShapeReveal(ctx, layer, lx, ly, lw, lh, progress);
      } else if (isComp('comparisonchart')) {
        renderComparisonChart(ctx, layer, lx, ly, lw, lh, progress);
      } else if (lType === 'text') {
        const fontSize = (layer.font_size || 48) * scale;
        const fontFam = layer.font_family || 'Geist';
        const fontWeight = layer.font_weight || 'bold';
        ctx.font = `${fontWeight} ${fontSize}px ${fontFam}, sans-serif`;
        ctx.fillStyle = layer.color || '#F3F4F6';
        
        const align = (layer.text_align || 'left') as CanvasTextAlign;
        ctx.textAlign = align;
        
        let textX = lx;
        let textY = ly;
        if (align === 'center') {
          textX = lx + lw / 2;
          ctx.textBaseline = 'middle';
          textY = ly + lh / 2;
        } else if (align === 'right') {
          textX = lx + lw;
          ctx.textBaseline = 'top';
        } else {
          ctx.textBaseline = 'top';
        }

        // Check typewriter animation
        let textToShow = layer.content;
        if (anim && anim.effect === 'typewriter') {
          const charCount = Math.floor(textToShow.length * progress);
          textToShow = textToShow.slice(0, charCount);
        }

        ctx.fillText(textToShow, textX, textY);
      } else if (lType === 'shape' || lType === 'badge' || lType === 'circle' || lType === 'gradient') {
        if (layer.shadow) {
          ctx.shadowColor = layer.shadow.color;
          ctx.shadowOffsetX = layer.shadow.offset_x;
          ctx.shadowOffsetY = layer.shadow.offset_y;
          ctx.shadowBlur = layer.shadow.blur;
        }

        if (lType === 'circle' || (layer.border_radius && layer.border_radius >= Math.min(lw, lh) / 2)) {
          ctx.beginPath();
          ctx.arc(lx + lw / 2, ly + lh / 2, Math.min(lw, lh) / 2, 0, Math.PI * 2);
        } else {
          drawRoundRect(ctx, lx, ly, lw, lh, layer.border_radius || 8);
        }

        if (layer.gradient && layer.gradient.stops && layer.gradient.stops.length > 0) {
          let g: CanvasGradient;
          if (layer.gradient.type === 'radial') {
            g = ctx.createRadialGradient(lx + lw / 2, ly + lh / 2, 2, lx + lw / 2, ly + lh / 2, Math.max(lw, lh) / 2);
          } else {
            const angleRad = ((layer.gradient.angle || 0) * Math.PI) / 180;
            const gx1 = lx;
            const gy1 = ly;
            const gx2 = lx + Math.cos(angleRad) * lw;
            const gy2 = ly + Math.sin(angleRad) * lh;
            g = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
          }
          for (const stop of layer.gradient.stops) {
            g.addColorStop(Math.max(0, Math.min(1, stop.position)), stop.color);
          }
          ctx.fillStyle = g;
        } else {
          ctx.fillStyle = layer.background_color || layer.color || '#15F5BA';
        }
        ctx.fill();

        if (layer.border_width && layer.border_width > 0) {
          ctx.strokeStyle = layer.border_color || '#15F5BA';
          ctx.lineWidth = layer.border_width;
          ctx.stroke();
        }

        if (layer.content && lType !== 'gradient') {
          ctx.fillStyle = '#0B0F10';
          ctx.font = `bold ${Math.round(lh * 0.45)}px 'Geist', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(layer.content, lx + lw / 2, ly + lh / 2);
        }
      } else if (lType === 'image' || lType === 'screenshot' || lType === 'svg') {
        const basename = layer.content ? (layer.content.split('/').pop() || '') : '';
        const img = (layer.content && imageCache.get(layer.content)) ||
                    (layer.asset_id && imageCache.get(layer.asset_id)) ||
                    (basename && imageCache.get(basename)) ||
                    null;
        if (img) {
          ctx.drawImage(img, lx, ly, lw, lh);
        } else {
          // Placeholder card
          drawRoundRect(ctx, lx, ly, lw, lh, 8);
          ctx.fillStyle = '#141A1C';
          ctx.fill();
          ctx.strokeStyle = '#1F292B';
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }
}
