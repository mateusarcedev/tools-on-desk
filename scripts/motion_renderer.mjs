#!/usr/bin/env node
/**
 * ToolsOnDesk Headless HTML/Canvas Motion Renderer
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

// Security: Validate file paths to avoid path traversal
function validateSafePath(p) {
  if (!p) return null;
  const resolved = path.resolve(p);
  return resolved;
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

  const width = Math.max(320, composition.width || 1080);
  const height = Math.max(240, composition.height || 1080);
  const fps = Math.min(60, Math.max(15, options.fps || composition.fps || 30));
  const durationSec = Math.max(0.5, composition.duration_sec || 5.0);
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

  // Load motion canvas bundle
  const bundlePath = path.join(__dirname, 'dist', 'motion_canvas.js');
  let bundleCode = '';
  if (fs.existsSync(bundlePath)) {
    bundleCode = fs.readFileSync(bundlePath, 'utf-8');
  } else {
    console.error('Bundle not found at', bundlePath);
    process.exit(1);
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

  // Prepare HTML page
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0B0F10; overflow: hidden; width: ${width}px; height: ${height}px; }
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

  const ffmpegProc = spawn(options.ffmpeg, ffmpegArgs, {
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

    // Progress report every 15 frames or at the end
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

main().catch((err) => {
  console.error('Render error:', err);
  process.exit(1);
});
