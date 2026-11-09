import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function bundleMotionCanvas() {
  await build({
    configFile: false,
    build: {
      lib: {
        entry: path.resolve(__dirname, '../src/services/motionCanvasRenderer.ts'),
        name: 'ToolsOnDeskMotion',
        fileName: () => 'motion_canvas.js',
        formats: ['iife'],
      },
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: false,
      minify: false,
    },
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  bundleMotionCanvas().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
