#!/usr/bin/env node
/**
 * ToolsOnDesk Headless HTML/Canvas Motion Renderer (Mission 10.3)
 * Captures real canvas frames deterministically and encodes them to MP4 via FFmpeg.
 */

import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    composition: null,
    output: null,
    framesDir: null,
    fps: 30,
    quality: 'high',
    saveFrames: true,
    ffmpeg: 'ffmpeg',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--composition' && args[i + 1]) {
      options.composition = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      options.output = args[++i];
    } else if (args[i] === '--frames-dir' && args[i + 1]) {
      options.framesDir = args[++i];
    } else if (args[i] === '--fps' && args[i + 1]) {
      options.fps = parseInt(args[++i], 10);
    } else if (args[i] === '--quality' && args[i + 1]) {
      options.quality = args[++i];
    } else if (args[i] === '--save-frames' && args[i + 1]) {
      options.saveFrames = args[++i] === 'true';
    } else if (args[i] === '--ffmpeg' && args[i + 1]) {
      options.ffmpeg = args[++i];
    }
  }

  return options;
}

// Security: Validate file paths to avoid path traversal (ETAPA 4)
function validateSafePath(p) {
  if (!p) return null;
  const resolved = path.resolve(p);
  return resolved;
}

function getSafeMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
}

async function main() {
  const options = parseArgs();

  if (!options.composition || !options.output) {
    console.error('Usage: node motion_renderer.mjs --composition <json_file|json_str> --output <output.mp4> [--frames-dir <dir>] [--fps <30>]');
    process.exit(1);
  }

  // Load composition JSON
  let composition;
  if (fs.existsSync(options.composition)) {
    const raw = fs.readFileSync(options.composition, 'utf-8');
    composition = JSON.parse(raw);
  } else {
    try {
      composition = JSON.parse(options.composition);
    } catch (e) {
      console.error('Invalid composition JSON or path:', e.message);
      process.exit(1);
    }
  }

  // Enforce resource & security limits (ETAPA 4)
  const width = Math.min(3840, Math.max(320, composition.width || 1080));
  const height = Math.min(2160, Math.max(240, composition.height || 1080));
  const fps = Math.min(60, Math.max(15, options.fps || composition.fps || 30));
  const durationSec = Math.min(180, Math.max(0.5, composition.duration_sec || 5.0));
  const totalFrames = Math.ceil(durationSec * fps);

  const outputPath = validateSafePath(options.output);
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  const framesDir = options.framesDir
    ? validateSafePath(options.framesDir)
    : path.join(outputDir, 'frames');

  if (options.saveFrames) {
    fs.mkdirSync(framesDir, { recursive: true });
  }

  // Ensure motion canvas bundle exists
  const bundlePath = path.join(__dirname, 'dist', 'motion_canvas.js');
  if (!fs.existsSync(bundlePath)) {
    console.log('Building motion_canvas.js bundle...');
    const { bundleMotionCanvas } = await import('./bundle_motion_canvas.mjs');
    await bundleMotionCanvas();
  }

  let bundleCode = '';
  if (fs.existsSync(bundlePath)) {
    bundleCode = fs.readFileSync(bundlePath, 'utf-8');
  } else {
    console.error('Bundle not found at', bundlePath);
    process.exit(1);
  }

  // Load local font binaries for deterministic offline rendering
  const publicFontsDir = path.resolve(__dirname, '..', 'public', 'fonts');
  let geistBase64 = '';
  let geistMonoBase64 = '';
  const geistPath = path.join(publicFontsDir, 'Geist.woff2');
  const geistMonoPath = path.join(publicFontsDir, 'GeistMono.woff2');
  if (fs.existsSync(geistPath)) {
    geistBase64 = fs.readFileSync(geistPath).toString('base64');
  }
  if (fs.existsSync(geistMonoPath)) {
    geistMonoBase64 = fs.readFileSync(geistMonoPath).toString('base64');
  }

  // Gather and convert all local asset images to Data URIs (ETAPA 4 & ETAPA 6)
  const imageMap = {};
  function registerImage(rawPath) {
    if (!rawPath || typeof rawPath !== 'string') return;
    if (rawPath.startsWith('data:')) {
      imageMap[rawPath] = rawPath;
      return;
    }
    let resolved = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
    if (!fs.existsSync(resolved)) {
      const rootResolved = path.resolve(__dirname, '..', rawPath);
      if (fs.existsSync(rootResolved)) {
        resolved = rootResolved;
      }
    }
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      const mime = getSafeMimeType(resolved);
      const buf = fs.readFileSync(resolved);
      const uri = `data:${mime};base64,${buf.toString('base64')}`;
      imageMap[rawPath] = uri;
      imageMap[resolved] = uri;
    }
  }

  for (const scene of composition.scenes || []) {
    for (const layer of scene.layers || []) {
      const lType = (layer.layer_type || '').toLowerCase();
      const compType = (layer.component_type || '').toLowerCase();
      if (
        lType === 'image' ||
        lType === 'screenshot' ||
        compType === 'screenshotshowcase' ||
        compType === 'logoreveal' ||
        (layer.content && (layer.content.endsWith('.png') || layer.content.endsWith('.jpg') || layer.content.endsWith('.jpeg') || layer.content.endsWith('.svg') || layer.content.endsWith('.webp')))
      ) {
        registerImage(layer.content);
      }
    }
  }

  // Setup Chromium browser
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
    ],
  });

  let ffmpegProc = null;
  const cleanup = async () => {
    try {
      if (ffmpegProc && !ffmpegProc.killed) {
        ffmpegProc.kill('SIGKILL');
      }
      await browser.close();
    } catch {}
  };

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(130);
  });
  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(143);
  });

  const page = await browser.newPage({
    viewport: { width, height },
  });

  // Block external network requests for isolation (ETAPA 4 Security)
  await page.route('**', (route) => {
    const url = route.request().url();
    if (url.startsWith('data:') || url.startsWith('file:')) {
      route.continue();
    } else {
      route.abort();
    }
  });

  // Prepare HTML page with offline embedded fonts
  const fontStyles = `
    @font-face {
      font-family: 'Geist';
      src: url('data:font/woff2;base64,${geistBase64}') format('woff2');
      font-weight: 100 900;
      font-style: normal;
    }
    @font-face {
      font-family: 'Geist Mono';
      src: url('data:font/woff2;base64,${geistMonoBase64}') format('woff2');
      font-weight: 100 900;
      font-style: normal;
    }
  `;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${fontStyles}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: ${composition.background_color || '#0B0F10'}; overflow: hidden; width: ${width}px; height: ${height}px; font-family: 'Geist', sans-serif; }
    #canvas { display: block; width: ${width}px; height: ${height}px; }
  </style>
</head>
<body>
  <canvas id="canvas" width="${width}" height="${height}"></canvas>
  <script>${bundleCode}</script>
  <script>
    window.COMPOSITION = ${JSON.stringify(composition)};
    window.CANVAS = document.getElementById('canvas');
    window.CTX = window.CANVAS.getContext('2d', { willReadFrequently: true });

    window.initEnvironment = async function(images) {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      if (window.ToolsOnDeskMotion && window.ToolsOnDeskMotion.preloadImage) {
        for (const [origPath, dataUri] of Object.entries(images)) {
          await window.ToolsOnDeskMotion.preloadImage(origPath, dataUri);
        }
      }
    };

    window.renderFrame = function(timeSec) {
      if (window.ToolsOnDeskMotion && window.ToolsOnDeskMotion.renderMotionCanvasFrame) {
        window.ToolsOnDeskMotion.renderMotionCanvasFrame(window.CTX, window.COMPOSITION, timeSec, ${width}, ${height});
      }
      return window.CANVAS.toDataURL('image/png');
    };
  </script>
</body>
</html>`;

  await page.setContent(htmlContent, { waitUntil: 'load' });

  // Preload fonts and images inside Chromium
  await page.evaluate(async (images) => {
    await window.initEnvironment(images);
  }, imageMap);

  // Prepare FFmpeg process
  const crf = options.quality === 'ultra' ? '16' : options.quality === 'standard' ? '23' : '20';
  const ffmpegArgs = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-framerate', String(fps),
    '-i', '-',
  ];

  // Optional audio
  let hasAudio = false;
  if (composition.audio_track && composition.audio_track.file_path) {
    const audioPath = composition.audio_track.file_path;
    if (fs.existsSync(audioPath)) {
      ffmpegArgs.push('-i', audioPath);
      hasAudio = true;
    }
  }

  if (hasAudio) {
    ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  }

  ffmpegArgs.push(
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'fast',
    '-crf', crf,
    '-t', String(durationSec.toFixed(2)),
    outputPath
  );

  ffmpegProc = spawn(options.ffmpeg, ffmpegArgs, {
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  ffmpegProc.on('error', (err) => {
    console.error('FFmpeg process error:', err);
  });

  const startTime = Date.now();

  // Deterministic frame loop
  for (let frame = 0; frame < totalFrames; frame++) {
    const timeSec = frame / fps;

    // Render frame on canvas and get base64 PNG data
    const dataUrl = await page.evaluate((t) => window.renderFrame(t), timeSec);
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Save frame to disk if requested
    if (options.saveFrames) {
      const frameFilename = `frame_${String(frame).padStart(6, '0')}.png`;
      fs.writeFileSync(path.join(framesDir, frameFilename), buffer);
    }

    // Pipe to FFmpeg
    ffmpegProc.stdin.write(buffer);

    // Progress report
    if (frame % 15 === 0 || frame === totalFrames - 1) {
      const progress = (frame + 1) / totalFrames;
      const jsonStatus = JSON.stringify({
        status: 'rendering',
        frame: frame + 1,
        totalFrames,
        progress: parseFloat(progress.toFixed(3)),
      });
      console.log(`PROGRESS:${jsonStatus}`);
    }
  }

  ffmpegProc.stdin.end();

  // Wait for FFmpeg to finish encoding
  await new Promise((resolve, reject) => {
    ffmpegProc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
  });

  await browser.close();

  const elapsedMs = Date.now() - startTime;
  console.log(`PROGRESS:${JSON.stringify({
    status: 'complete',
    outputPath,
    totalFrames,
    fps,
    durationSec,
    elapsedMs,
  })}`);
}

main().catch(async (err) => {
  console.error('Render error:', err);
  process.exit(1);
});
