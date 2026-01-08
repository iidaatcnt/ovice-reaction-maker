'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

// Types
type AnimationType = 'pulse' | 'spin' | 'rainbow' | 'slide' | 'shake' | 'bounce' | 'grow' | 'blink';
type BgPattern = 'none' | 'heart' | 'star' | 'burst' | 'bubble';

type SizePreset = {
  id: string;
  label: string;
  width: number;
  height: number;
  desc?: string;
};

const SIZE_PRESETS: SizePreset[] = [
  { id: 'rec', label: '長方形', width: 300, height: 200, desc: '300x200 (推奨)' },
  { id: 'sq', label: '正方形', width: 200, height: 200, desc: '200x200 (スタンプ)' },
  { id: 'ban', label: '看板', width: 256, height: 60, desc: '256x60 (看板)' },
];

export default function Home() {
  const [text, setText] = useState('WOW');
  const [textColor, setTextColor] = useState('#ffffff');
  const [bgColor, setBgColor] = useState('#00000000');
  const [isTransparent, setIsTransparent] = useState(true);
  const [bgPattern, setBgPattern] = useState<BgPattern>('none');
  const [animationType, setAnimationType] = useState<AnimationType>('pulse');
  // const fps = 20; // Unused for now
  const [duration, setDuration] = useState(2); // seconds
  const [currentSize, setCurrentSize] = useState<SizePreset>(SIZE_PRESETS[0]); // Canvas size
  const [isGenerating, setIsGenerating] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Constants
  // const SIZE = 128; // Removed constant

  // Render a single frame
  const renderFrame = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    t: number // 0 to 1
  ) => {
    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background
    if (!isTransparent) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
    }

    // Background Pattern
    if (bgPattern !== 'none') {
      ctx.save();
      // Pattern color: white/low-opacity if colored bg, or solid if transparent
      ctx.fillStyle = isTransparent ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.15)';
      ctx.strokeStyle = isTransparent ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.15)';

      if (bgPattern === 'burst') {
        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.max(width, height);
        const rays = 20;
        ctx.beginPath();
        for (let i = 0; i < rays; i++) {
          const angle = (i / rays) * Math.PI * 2;
          const bgRotation = (animationType === 'spin' || animationType === 'rainbow') ? t * Math.PI : 0;
          const a1 = angle + bgRotation;
          const a2 = angle + (Math.PI / rays) * 0.5 + bgRotation;

          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius);
          ctx.lineTo(cx + Math.cos(a2) * radius, cy + Math.sin(a2) * radius);
          ctx.closePath();
        }
        ctx.fill();
      } else if (bgPattern === 'bubble') {
        const pad = 10;
        ctx.lineWidth = 4;
        ctx.beginPath();
        // simple rect fallback for compatibility if roundRect missing
        if (ctx.roundRect) {
          ctx.roundRect(pad, pad, width - pad * 2, height - pad * 2, 20);
        } else {
          ctx.rect(pad, pad, width - pad * 2, height - pad * 2);
        }
        ctx.stroke();

        ctx.beginPath();
        // draw small tail at bottom center
        ctx.moveTo(width / 2 - 10, height - pad * 2);
        ctx.lineTo(width / 2, height - pad + 5);
        ctx.lineTo(width / 2 + 10, height - pad * 2);
        ctx.fill();

      } else {
        // Scatter patterns (Heart, Star)
        const rows = 4;
        const cols = 5;
        const cellW = width / cols;
        const cellH = height / rows;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const cx = c * cellW + cellW / 2;
            const cy = r * cellH + cellH / 2;
            // Stagger
            const offX = (r % 2 === 0) ? 0 : cellW / 2;

            const drawSize = Math.min(cellW, cellH) * 0.3;

            ctx.save();
            ctx.translate(cx + offX - (r % 2 ? cellW / 2 : 0), cy);

            if (bgPattern === 'heart') {
              // Heart path
              ctx.beginPath();
              const topCurveHeight = drawSize * 0.3;
              ctx.moveTo(0, drawSize * 0.3);
              ctx.bezierCurveTo(0, 0, -drawSize, 0, -drawSize, topCurveHeight);
              ctx.bezierCurveTo(-drawSize, (drawSize + topCurveHeight) / 2,
                0, (drawSize + topCurveHeight),
                0, drawSize);
              ctx.bezierCurveTo(0, (drawSize + topCurveHeight),
                drawSize, (drawSize + topCurveHeight) / 2,
                drawSize, topCurveHeight);
              ctx.bezierCurveTo(drawSize, 0, 0, 0, 0, drawSize * 0.3);
              ctx.fill();
            } else if (bgPattern === 'star') {
              // Star path
              const spikes = 5;
              const outer = drawSize;
              const inner = drawSize * 0.5;
              let rot = Math.PI / 2 * 3;
              const step = Math.PI / spikes;

              ctx.beginPath();
              ctx.moveTo(0, 0 - outer);
              for (let i = 0; i < spikes; i++) {
                let x = Math.cos(rot) * outer;
                let y = Math.sin(rot) * outer;
                ctx.lineTo(x, y);
                rot += step;

                x = Math.cos(rot) * inner;
                y = Math.sin(rot) * inner;
                ctx.lineTo(x, y);
                rot += step;
              }
              ctx.lineTo(0, 0 - outer);
              ctx.closePath();
              ctx.fill();
            }
            ctx.restore();
          }
        }
      }
      ctx.restore();
    }

    // Font settings
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Dynamic Font Size fitting
    // Convert to uppercase for rendering consistency
    const drawText = text.toUpperCase();
    const lines = drawText.split('\n');

    // Calculate scale scale based on base size 128
    // Use the smaller dimension to scale font appropriate for the box
    const scaleFactor = Math.min(width, height) / 128;

    let baseFontSize = 40;
    const maxLineLength = Math.max(...lines.map(l => l.length));

    if (maxLineLength > 5) baseFontSize = 30;
    if (maxLineLength > 8) baseFontSize = 20;

    // Adjust for multiple lines
    if (lines.length > 2) baseFontSize = Math.min(baseFontSize, 30);
    if (lines.length > 3) baseFontSize = Math.min(baseFontSize, 20);

    const fontSize = baseFontSize * scaleFactor;
    const lineHeight = fontSize * 1.1; // 1.1 is strictly for line spacing visual

    // Add Japanese font fallbacks
    ctx.font = `900 ${fontSize}px "Outfit", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif`;

    // Animation Logic
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.save();
    ctx.translate(centerX, centerY);

    if (animationType === 'pulse') {
      const scale = 1 + Math.sin(t * Math.PI * 2) * 0.2;
      ctx.scale(scale, scale);
    } else if (animationType === 'spin') {
      ctx.rotate(t * Math.PI * 2);
    } else if (animationType === 'shake') {
      const shakeX = Math.sin(t * Math.PI * 8) * 5 * scaleFactor;
      const shakeY = Math.cos(t * Math.PI * 6) * 3 * scaleFactor;
      ctx.translate(shakeX, shakeY);
    } else if (animationType === 'rainbow') {
      const hue = t * 360;
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    } else if (animationType === 'slide') {
      const offsetX = (t - 0.5) * width * 1.5;
      ctx.translate(offsetX, 0);
    } else if (animationType === 'bounce') {
      const bounceY = Math.sin(t * Math.PI * 2) * 10 * scaleFactor;
      ctx.translate(0, bounceY);
    } else if (animationType === 'grow') {
      const scale = t < 0.5 ? t * 2 : (1 - t) * 2;
      ctx.scale(scale, scale);
    } else if (animationType === 'blink') {
      ctx.globalAlpha = t < 0.5 ? 1 : 0.2;
    }

    // Set Color (if not rainbow override)
    if (animationType !== 'rainbow') {
      ctx.fillStyle = textColor;
    }

    // Draw Text Loop
    // Render text centered
    const totalHeight = lines.length * lineHeight;
    const startY = -(totalHeight / 2) + (lineHeight / 2);

    ctx.lineWidth = 3 * scaleFactor;
    ctx.strokeStyle = 'black';
    ctx.lineJoin = 'round';

    lines.forEach((line, i) => {
      const yOffset = startY + (i * lineHeight);

      // Stroke first
      if (!isTransparent || textColor !== '#000000') {
        ctx.strokeText(line, 0, yOffset);
      }
      // Then fill
      ctx.fillText(line, 0, yOffset);
    });

    ctx.restore();
  }, [text, textColor, bgColor, isTransparent, bgPattern, animationType]);

  // Live Preview Loop
  useEffect(() => {
    let animationId: number;
    const ctx = previewCanvasRef.current?.getContext('2d');

    const animate = () => {
      if (!ctx) return;
      const now = Date.now();
      const loopTime = duration * 1000;
      const t = (now % loopTime) / loopTime;

      renderFrame(ctx, currentSize.width, currentSize.height, t);
      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, [renderFrame, duration, currentSize]);

  // Generate GIF
  const handleDownload = async () => {
    if (!canvasRef.current) return;
    setIsGenerating(true);

    // Yield to UI to show loading state
    await new Promise(r => setTimeout(r, 100));

    try {
      const fps = 20;
      const gif = new GIFEncoder();
      const frames = fps * duration;
      const width = currentSize.width;
      const height = currentSize.height;

      const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error("No context");

      // We need to use 'void' or handle the return value if strictly typed, but here for loop is fine.
      for (let i = 0; i < frames; i++) {
        const t = i / frames;
        renderFrame(ctx, width, height, t);

        const imageData = ctx.getImageData(0, 0, width, height);
        const { data } = imageData;

        // Alpha Thresholding to fix dirty edges on transparent background
        // Converts semi-transparent pixels (antialiasing) to fully transparent or opaque
        if (isTransparent) {
          for (let j = 0; j < data.length; j += 4) {
            const alpha = data[j + 3];
            // Threshold: if alpha < 128, make it transparent (0). Else opaque (255)
            if (alpha < 128) {
              data[j + 3] = 0;
            } else {
              data[j + 3] = 255;
            }
          }
        }

        const palette = quantize(data, 256);
        const index = applyPalette(data, palette);

        gif.writeFrame(index, width, height, {
          palette,
          delay: (duration * 1000) / frames,
          transparent: isTransparent
        });
      }

      gif.finish();

      const buffer = gif.bytes();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = new Blob([buffer as any], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;

      const now = new Date();
      const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

      link.download = `voice-reaction-${yyyymmdd}-${width}x${height}.gif`;
      link.click();

    } catch (e) {
      console.error(e);
      alert("Error generating GIF");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-8 gap-8">
      <header className="text-center space-y-2 mt-8">
        <h1 className="text-5xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]">
            Ovice
          </span>{" "}
          Reaction Maker
        </h1>
        <p className="text-[var(--text-secondary)] text-lg">
          Create animated GIFs for your virtual office reactions!
        </p>
      </header>

      <main className="w-full max-w-4xl flex flex-col md:flex-row gap-8 items-start justify-center">

        {/* Preview Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="p-[2px] rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] shadow-[0_0_40px_-10px_var(--primary-glow)]">
            {/* Wrapper to center canvas and show checkerboard */}
            <div className={`relative bg-[#2a2a2a] rounded-[calc(var(--radius-md)-2px)] overflow-hidden image-pixelated`}
              style={{
                width: currentSize.width,
                height: currentSize.height,
                backgroundImage: `
                      linear-gradient(45deg, #1f1f1f 25%, transparent 25%),
                      linear-gradient(-45deg, #1f1f1f 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #1f1f1f 75%),
                      linear-gradient(-45deg, transparent 75%, #1f1f1f 75%)
                    `,
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
              }}
            >
              <canvas
                ref={previewCanvasRef}
                width={currentSize.width}
                height={currentSize.height}
                className="w-full h-full block"
                title="Preview"
              />
            </div>
            {/* Hidden canvas for generation */}
            <canvas
              ref={canvasRef}
              width={currentSize.width}
              height={currentSize.height}
              style={{ display: 'none' }}
            />
          </div>
          <p className="text-sm font-mono text-gray-500">
            Preview ({currentSize.width}x{currentSize.height})
          </p>
        </div>

        {/* Controls Section */}
        <div className="flex-1 w-full bg-[#1a1a23] p-8 rounded-3xl border border-white/5 flex flex-col gap-6 shadow-xl">

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Text</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              maxLength={20}
              placeholder="WOW"
              rows={2}
              className="w-full bg-black/30 border border-white/10 text-white p-3 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all font-bold text-lg resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Animation</label>
              <select
                value={animationType}
                onChange={e => setAnimationType(e.target.value as AnimationType)}
                className="w-full bg-black/30 border border-white/10 text-white p-3 rounded-lg focus:outline-none focus:border-[var(--primary)] cursor-pointer"
              >
                <option value="pulse">Pulse</option>
                <option value="spin">Spin</option>
                <option value="rainbow">Rainbow</option>
                <option value="shake">Shake</option>
                <option value="slide">Slide</option>
                <option value="bounce">Bounce</option>
                <option value="grow">Grow</option>
                <option value="blink">Blink</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Pattern</label>
              <select
                value={bgPattern}
                onChange={e => setBgPattern(e.target.value as BgPattern)}
                className="w-full bg-black/30 border border-white/10 text-white p-3 rounded-lg focus:outline-none focus:border-[var(--primary)] cursor-pointer"
              >
                <option value="none">None</option>
                <option value="heart">Heart</option>
                <option value="star">Star</option>
                <option value="burst">Burst</option>
                <option value="bubble">Bubble</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Size</label>
            <div className="flex flex-col gap-2">
              {SIZE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setCurrentSize(preset)}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all ${currentSize.id === preset.id
                      ? 'bg-[var(--primary)] text-white shadow-lg scale-[1.02]'
                      : 'bg-black/30 text-gray-400 hover:bg-white/10'
                    }`}
                >
                  <span>{preset.label}</span>
                  <span className="font-mono text-xs opacity-70">{preset.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[120px] flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Text Color</label>
              <div className="flex items-center gap-3 bg-black/30 p-2 rounded-lg border border-white/10">
                <input
                  type="color"
                  value={textColor}
                  onChange={e => setTextColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0"
                />
                <span className="font-mono text-sm">{textColor}</span>
              </div>
            </div>

            <div className="flex-1 min-w-[150px] flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Background</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isTransparent}
                    onChange={e => setIsTransparent(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-500 text-[var(--primary)] focus:ring-[var(--primary)] bg-transparent"
                  />
                  <span className="text-sm">Transparent</span>
                </label>
                {!isTransparent && (
                  <div className="flex items-center gap-3 bg-black/30 p-2 rounded-lg border border-white/10 animate-in fade-in slide-in-from-top-1 duration-200">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={e => setBgColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0"
                    />
                    <span className="font-mono text-sm">{bgColor}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Duration</label>
              <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded">{duration}s</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={duration}
              onChange={e => setDuration(parseFloat(e.target.value))}
              className="w-full accent-[var(--primary)] h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <button
            className="mt-2 w-full py-4 text-lg font-black uppercase text-white rounded-xl shadow-lg transform transition-all hover:-translate-y-1 hover:shadow-2xl active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </span>
            ) : 'Download GIF'}
          </button>

        </div>
      </main>

      <footer className="w-full max-w-4xl flex justify-between items-center text-xs text-gray-500 mt-8 pb-4 border-t border-white/10 pt-4">
        <div className="flex items-center gap-2">
          <span>&copy; 2026 iidaatcnt</span>
          <img src="/footer-logo.png" alt="Logo" className="h-6 w-auto opacity-80" />
        </div>
        <div className="font-mono bg-white/5 px-2 py-1 rounded">
          v0.2.0-beta
        </div>
      </footer>
    </div>
  );
}
