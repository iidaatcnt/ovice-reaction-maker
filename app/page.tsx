'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

// Types
type AnimationType = 'pulse' | 'spin' | 'rainbow' | 'slide' | 'shake' | 'bounce' | 'grow' | 'blink';

export default function Home() {
  const [text, setText] = useState('WOW');
  const [textColor, setTextColor] = useState('#ffffff');
  const [bgColor, setBgColor] = useState('#00000000');
  const [isTransparent, setIsTransparent] = useState(true);
  const [animationType, setAnimationType] = useState<AnimationType>('pulse');
  // const fps = 20; // Unused for now
  const [duration, setDuration] = useState(2); // seconds
  const [isGenerating, setIsGenerating] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Constants
  const SIZE = 128; // Standard emoji size suitable for reaction

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

    // Font settings
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Dynamic Font Size fitting
    // Convert to uppercase for rendering consistency
    const drawText = text.toUpperCase();

    let fontSize = 40;
    if (drawText.length > 5) fontSize = 30;
    if (drawText.length > 8) fontSize = 20;

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
      const shakeX = Math.sin(t * Math.PI * 8) * 5;
      const shakeY = Math.cos(t * Math.PI * 6) * 3;
      ctx.translate(shakeX, shakeY);
    } else if (animationType === 'rainbow') {
      const hue = t * 360;
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    } else if (animationType === 'slide') {
      const offsetX = (t - 0.5) * width * 1.5;
      ctx.translate(offsetX, 0);
    } else if (animationType === 'bounce') {
      const bounceY = Math.sin(t * Math.PI * 2) * 10;
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

    // Draw Text
    ctx.fillText(drawText, 0, 0);

    // Stroke/Shadow for better visibility
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'black';
    if (!isTransparent || textColor !== '#000000') {
      ctx.strokeText(drawText, 0, 0);
    }

    ctx.restore();
  }, [text, textColor, bgColor, isTransparent, animationType]);

  // Live Preview Loop
  useEffect(() => {
    let animationId: number;
    const ctx = previewCanvasRef.current?.getContext('2d');

    const animate = () => {
      if (!ctx) return;
      const now = Date.now();
      const loopTime = duration * 1000;
      const t = (now % loopTime) / loopTime;

      renderFrame(ctx, SIZE, SIZE, t);
      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, [renderFrame, duration]);

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
      const width = SIZE;
      const height = SIZE;

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
      link.download = `voice-reaction-${text}.gif`;
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
            <canvas
              ref={previewCanvasRef}
              width={SIZE}
              height={SIZE}
              className="bg-[#2a2a2a] rounded-[calc(var(--radius-md)-2px)] block w-[256px] h-[256px] image-pixelated cursor-pointer hover:scale-105 transition-transform"
              style={{
                backgroundImage: `
                  linear-gradient(45deg, #1f1f1f 25%, transparent 25%),
                  linear-gradient(-45deg, #1f1f1f 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #1f1f1f 75%),
                  linear-gradient(-45deg, transparent 75%, #1f1f1f 75%)
                `,
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
              }}
              title="Preview"
            />
            {/* Hidden canvas for generation */}
            <canvas
              ref={canvasRef}
              width={SIZE}
              height={SIZE}
              style={{ display: 'none' }}
            />
          </div>
          <p className="text-sm font-mono text-gray-500">Live Preview ({SIZE}x{SIZE})</p>
        </div>

        {/* Controls Section */}
        <div className="flex-1 w-full bg-[#1a1a23] p-8 rounded-3xl border border-white/5 flex flex-col gap-6 shadow-xl">

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Text</label>
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              maxLength={10}
              placeholder="WOW"
              className="w-full bg-black/30 border border-white/10 text-white p-3 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all font-bold text-lg"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-2">
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
