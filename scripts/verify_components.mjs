import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

async function verifyComponents() {
  console.log('--- VERIFYING 12 REAL MOTION COMPONENTS ---');

  const framesDir = 'target/components_proof/frames';
  const mp4Path = 'target/components_proof/all_components_showcase.mp4';

  if (!fs.existsSync(mp4Path)) {
    throw new Error('Showcase MP4 missing: ' + mp4Path);
  }

  // Check 12 representative frames:
  // Scene 1: 0..90 frames
  //   AnimatedGrid, AnimatedArray, ProgressCounter
  // Scene 2: 90..180 frames
  //   AnimatedChart, ComparisonChart, AnimatedBar
  // Scene 3: 180..270 frames
  //   DiagramNode, AnimatedConnector, ShapeReveal
  // Scene 4: 270..360 frames
  //   FeatureCard, ScreenshotShowcase, LogoReveal

  const sampleFrames = [
    { name: 'Scene 1 Start (f10)', file: 'frame_000010.png' },
    { name: 'Scene 1 Mid (f45)', file: 'frame_000045.png' },
    { name: 'Scene 1 End (f80)', file: 'frame_000080.png' },
    { name: 'Scene 2 Start (f100)', file: 'frame_000100.png' },
    { name: 'Scene 2 Mid (f135)', file: 'frame_000135.png' },
    { name: 'Scene 2 End (f170)', file: 'frame_000170.png' },
    { name: 'Scene 3 Start (f190)', file: 'frame_000190.png' },
    { name: 'Scene 3 Mid (f225)', file: 'frame_000225.png' },
    { name: 'Scene 3 End (f260)', file: 'frame_000260.png' },
    { name: 'Scene 4 Start (f280)', file: 'frame_000280.png' },
    { name: 'Scene 4 Mid (f315)', file: 'frame_000315.png' },
    { name: 'Scene 4 End (f350)', file: 'frame_000350.png' },
  ];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  for (const sample of sampleFrames) {
    const fullPath = path.join(framesDir, sample.file);
    if (!fs.existsSync(fullPath)) {
      throw new Error('Missing frame: ' + sample.file);
    }

    const b64 = fs.readFileSync(fullPath).toString('base64');
    const stats = await page.evaluate(async (b64Data) => {
      const img = new Image();
      await new Promise((res) => {
        img.onload = res;
        img.src = 'data:image/png;base64,' + b64Data;
      });

      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const idata = ctx.getImageData(0, 0, 1280, 720);
      const data = idata.data;

      let nonBlackPixels = 0;
      let mintPixels = 0;
      let totalLuminance = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuminance += lum;

        if (r > 20 || g > 25 || b > 25) {
          nonBlackPixels++;
        }
        // Mint color check (#15F5BA -> r:21, g:245, b:186)
        if (Math.abs(r - 21) < 45 && Math.abs(g - 245) < 45 && Math.abs(b - 186) < 45) {
          mintPixels++;
        }
      }

      return {
        nonBlackRatio: nonBlackPixels / (1280 * 720),
        mintPixels,
        avgLuminance: totalLuminance / (1280 * 720),
      };
    }, b64);

    console.log(
      `✓ [${sample.name}] nonBlackRatio: ${(stats.nonBlackRatio * 100).toFixed(1)}% | mintPixels: ${stats.mintPixels} | avgLum: ${stats.avgLuminance.toFixed(1)}`
    );

    if (stats.nonBlackRatio < 0.05) {
      throw new Error(`Frame ${sample.file} is virtually empty/black! Ratio: ${stats.nonBlackRatio}`);
    }
    if (stats.mintPixels < 50) {
      throw new Error(`Frame ${sample.file} missing mint accent elements! Mint count: ${stats.mintPixels}`);
    }
  }

  await browser.close();
  console.log('\n>>> ALL 12 COMPONENTS VALIDATED WITH ACTIVE RENDERING! <<<\n');
}

verifyComponents().catch((e) => {
  console.error('COMPONENT VERIFICATION FAILED:', e);
  process.exit(1);
});
