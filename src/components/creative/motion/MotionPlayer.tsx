import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MotionComposition } from '../../../types/creative';
import { Button } from '../../common/Button';
import { Icon } from '../../common/Icon';

interface MotionPlayerProps {
  composition: MotionComposition;
  onExportMp4?: () => void;
  onExportRemotion?: () => void;
}

export const MotionPlayer: React.FC<MotionPlayerProps> = ({
  composition,
  onExportMp4,
  onExportRemotion,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const duration = composition.duration_sec || 5.0;
  const isLoop = true;

  // Animation frame loop
  const animFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // Easing calculators
  const calculateEasing = (t: number, easing?: string): number => {
    const clamped = Math.max(0, Math.min(1, t));
    switch (easing) {
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
  };

  // Render a single frame onto the canvas
  const renderFrame = useCallback(
    (timeSec: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // 1. Draw Background
      ctx.fillStyle = composition.background_color || '#0B0F10';
      ctx.fillRect(0, 0, w, h);

      // 2. Iterate scenes
      for (const scene of composition.scenes) {
        const sStart = scene.start_time;
        const sEnd = sStart + scene.duration_sec;

        if (timeSec < sStart || timeSec > sEnd) continue;

        // Iterate layers sorted by z_index
        const sortedLayers = [...scene.layers].sort((a, b) => a.z_index - b.z_index);

        for (const layer of sortedLayers) {
          const lStart = sStart + layer.start_time;
          const lEnd = lStart + layer.duration_sec;

          if (timeSec < lStart || timeSec > lEnd) continue;

          // Compute animation progress
          const anim = layer.animation;
          let progress = 1.0;
          if (anim) {
            const animStart = lStart + anim.delay_sec;
            const animDuration = anim.duration_sec || 0.6;
            if (timeSec < animStart) {
              progress = 0;
            } else {
              const rawT = (timeSec - animStart) / animDuration;
              progress = calculateEasing(rawT, anim.easing);
            }
          }

          // Layer transform
          ctx.save();

          let opacity = layer.opacity !== undefined ? layer.opacity : 1.0;
          let scale = layer.scale !== undefined ? layer.scale : 1.0;
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
                yOffset = (1 - progress) * (h * 0.15);
                opacity *= Math.min(1, progress * 2);
                break;
              case 'bounce':
                scale *= 0.8 + 0.2 * progress;
                break;
              case 'glow':
                ctx.shadowColor = layer.color || '#15F5BA';
                ctx.shadowBlur = 20 * progress;
                break;
            }
          }

          ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

          // Draw layer text or shape
          if (layer.layer_type === 'text') {
            const fontSize = (layer.font_size || 48) * (scale || 1.0);
            ctx.font = `bold ${fontSize}px Geist, sans-serif`;
            ctx.fillStyle = layer.color || '#FFFFFF';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            const x = layer.x * w;
            const y = layer.y * h + yOffset;

            ctx.fillText(layer.content, x, y);
          } else if (layer.layer_type === 'shape' || layer.layer_type === 'badge') {
            const x = layer.x * w;
            const y = layer.y * h + yOffset;
            const rw = layer.width * w * scale;
            const rh = layer.height * h * scale;

            ctx.fillStyle = layer.color || '#15F5BA';
            ctx.beginPath();
            ctx.roundRect(x, y, rw, rh, 8);
            ctx.fill();

            if (layer.content) {
              ctx.fillStyle = '#0B0F10';
              ctx.font = `bold ${rh * 0.45}px Geist, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(layer.content, x + rw / 2, y + rh / 2);
            }
          }

          ctx.restore();
        }
      }
    },
    [composition]
  );

  // Playback tick
  const tick = useCallback(
    (timestamp: number) => {
      if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
      const deltaSec = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      setCurrentTime((prev) => {
        let next = prev + deltaSec;
        if (next >= duration) {
          if (isLoop) {
            next = 0;
          } else {
            setIsPlaying(false);
            return duration;
          }
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(tick);
    },
    [duration, isLoop]
  );

  useEffect(() => {
    if (isPlaying) {
      lastTimestampRef.current = null;
      animFrameRef.current = requestAnimationFrame(tick);
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, tick]);

  useEffect(() => {
    renderFrame(currentTime);
  }, [currentTime, renderFrame]);

  const togglePlay = () => {
    if (currentTime >= duration) {
      setCurrentTime(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleRestart = () => {
    setCurrentTime(0);
    if (!isPlaying) {
      renderFrame(0);
    }
  };

  const formatTimecode = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0B0F10',
        borderRadius: 12,
        border: '1px solid var(--line)',
        overflow: 'hidden',
      }}
    >
      {/* Player Header / Metric bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isPlaying ? 'var(--mint)' : 'var(--muted)',
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
            {composition.title || 'Motion Design Composition'}
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            {composition.width} × {composition.height} ({composition.fps} fps)
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {onExportRemotion && (
            <Button variant="ghost" size="sm" onClick={onExportRemotion}>
              Exportar TSX (Remotion)
            </Button>
          )}
          {onExportMp4 && (
            <Button variant="primary" size="sm" onClick={onExportMp4}>
              <Icon name="video" size={14} /> Renderizar MP4
            </Button>
          )}
        </div>
      </div>

      {/* Canvas Viewport */}
      <div
        style={{
          flex: 1,
          minHeight: 380,
          maxHeight: 520,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#050708',
          position: 'relative',
          padding: 16,
        }}
      >
        <canvas
          ref={canvasRef}
          width={composition.width || 1080}
          height={composition.height || 1080}
          style={{
            maxWidth: '100%',
            maxHeight: 480,
            objectFit: 'contain',
            borderRadius: 6,
            boxShadow: '0 8px 30px rgba(0,0,0,0.7)',
            border: '1px solid var(--line)',
          }}
        />
      </div>

      {/* Scrubber & Controls */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: 'var(--surface)',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* Progress Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={currentTime}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setCurrentTime(val);
              renderFrame(val);
            }}
            style={{
              flex: 1,
              accentColor: 'var(--mint)',
              cursor: 'pointer',
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontFamily: 'var(--font-mono, monospace)',
              color: 'var(--fg)',
              minWidth: 120,
              textAlign: 'right',
            }}
          >
            {formatTimecode(currentTime)} / {formatTimecode(duration)}
          </span>
        </div>

        {/* Buttons Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={togglePlay}>
              <Icon name={isPlaying ? 'pause' : 'play'} size={14} />
              {isPlaying ? 'Pausar' : 'Reproduzir'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRestart}>
              <Icon name="retry" size={14} /> Reiniciar
            </Button>
          </div>

          <div
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            Motor: Arce Motion Engine (60 FPS Native)
          </div>
        </div>
      </div>
    </div>
  );
};
