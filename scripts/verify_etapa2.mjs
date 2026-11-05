import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function verify() {
  console.log('--- VERIFYING ETAPA 2 MINIMAL PROOF ---');

  const mp4Path = 'target/etapa2_proof/etapa2_minimal_proof.mp4';
  if (!fs.existsSync(mp4Path)) {
    throw new Error('MP4 file does not exist: ' + mp4Path);
  }

  // 1. Verify MP4 with ffprobe
  const probeOutput = execSync(
    `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,nb_frames:format=duration,size -of json ${mp4Path}`,
    { encoding: 'utf-8' }
  );
  const probe = JSON.parse(probeOutput);
  const stream = probe.streams[0];
  const format = probe.format;

  console.log(`MP4 Resolution: ${stream.width}x${stream.height}`);
  console.log(`MP4 Framerate: ${stream.r_frame_rate}`);
  console.log(`MP4 Frames: ${stream.nb_frames}`);
  console.log(`MP4 Duration: ${format.duration}s`);
  console.log(`MP4 Size: ${format.size} bytes`);

  if (stream.width !== 1280 || stream.height !== 720) {
    throw new Error(`Unexpected resolution: ${stream.width}x${stream.height}`);
  }
  if (stream.nb_frames !== '60' && stream.nb_frames !== 60) {
    throw new Error(`Expected exactly 60 frames, got ${stream.nb_frames}`);
  }
  if (Math.abs(parseFloat(format.duration) - 2.0) > 0.05) {
    throw new Error(`Expected ~2.0s duration, got ${format.duration}`);
  }

  // 2. Inspect captured frames
  const f0Path = 'target/etapa2_proof/frames/frame_000000.png';
  const f30Path = 'target/etapa2_proof/frames/frame_000030.png';
  const f59Path = 'target/etapa2_proof/frames/frame_000059.png';

  const f0Base64 = fs.readFileSync(f0Path).toString('base64');
  const f30Base64 = fs.readFileSync(f30Path).toString('base64');
  const f59Base64 = fs.readFileSync(f59Path).toString('base64');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const analysis = await page.evaluate(async ({ f0, f30, f59 }) => {
    function load(b64) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = 'data:image/png;base64,' + b64;
      });
    }

    const img0 = await load(f0);
    const img30 = await load(f30);
    const img59 = await load(f59);

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    function getCircleCentroidX(img) {
      ctx.clearRect(0, 0, 1280, 720);
      ctx.drawImage(img, 0, 0);
      // Circle moves around y: 468 (band 450 to 600)
      const idata = ctx.getImageData(0, 450, 1280, 150);
      const data = idata.data;
      let totalX = 0;
      let count = 0;

      for (let y = 0; y < 150; y++) {
        for (let x = 0; x < 1280; x++) {
          const idx = (y * 1280 + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          // Mint color: r ~ 21, g ~ 245, b ~ 186
          if (Math.abs(r - 21) < 40 && Math.abs(g - 245) < 40 && Math.abs(b - 186) < 40) {
            totalX += x;
            count++;
          }
        }
      }
      return count > 0 ? totalX / count : null;
    }

    function getCounterHash(img) {
      ctx.clearRect(0, 0, 1280, 720);
      ctx.drawImage(img, 0, 0);
      // Counter is at x: [665, 1150], y: [200, 360]
      const idata = ctx.getImageData(665, 200, 485, 160);
      const data = idata.data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += data[i] + data[i + 1] + data[i + 2];
      }
      return sum;
    }

    return {
      x0: getCircleCentroidX(img0),
      x30: getCircleCentroidX(img30),
      x59: getCircleCentroidX(img59),
      counter0: getCounterHash(img0),
      counter30: getCounterHash(img30),
      counter59: getCounterHash(img59),
    };
  }, { f0: f0Base64, f30: f30Base64, f59: f59Base64 });

  await browser.close();

  console.log(`Frame 0 Circle Centroid X: ${analysis.x0?.toFixed(1)}px (Expected: ~160px)`);
  console.log(`Frame 30 Circle Centroid X: ${analysis.x30?.toFixed(1)}px (Expected: ~540px)`);
  console.log(`Frame 59 Circle Centroid X: ${analysis.x59?.toFixed(1)}px (Expected: ~920px)`);

  if (analysis.x0 === null || analysis.x30 === null || analysis.x59 === null) {
    throw new Error('Circle not detected in one or more frames!');
  }

  if (!(analysis.x0 < analysis.x30 && analysis.x30 < analysis.x59)) {
    throw new Error(`Circle did not move left to right! x0=${analysis.x0}, x30=${analysis.x30}, x59=${analysis.x59}`);
  }

  const midExpected = (analysis.x0 + analysis.x59) / 2;
  const midDiff = Math.abs(analysis.x30 - midExpected);
  console.log(`Midpoint check diff: ${midDiff.toFixed(1)}px (Tolerance < 30px)`);
  if (midDiff > 30) {
    throw new Error(`Frame 30 is not near halfway point! x30=${analysis.x30}, expected=${midExpected}`);
  }

  console.log(`Counter Hash Frame 0: ${analysis.counter0}`);
  console.log(`Counter Hash Frame 30: ${analysis.counter30}`);
  console.log(`Counter Hash Frame 59: ${analysis.counter59}`);

  if (analysis.counter0 === analysis.counter30 || analysis.counter30 === analysis.counter59) {
    throw new Error('Counter pixels did not evolve across frames!');
  }

  console.log('\n>>> ETAPA 2 MINIMAL PROOF PASSED WITH 100% SUCCESS! <<<\n');
}

verify().catch((e) => {
  console.error('ETAPA 2 FAILED:', e);
  process.exit(1);
});
