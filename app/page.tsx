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
  const [text, setText] = useState('YES');
  const [textColor, setTextColor] = useState('#ffffff');
  const [bgColor, setBgColor] = useState('#00000000');
  const [isTransparent, setIsTransparent] = useState(true);
  const [bgPattern, setBgPattern] = useState<BgPattern>('none');
  const [animationType, setAnimationType] = useState<AnimationType>('pulse');
  // const fps = 20; // Unused for now
  const [duration, setDuration] = useState(2); // seconds
  const [currentSize, setCurrentSize] = useState<SizePreset>(SIZE_PRESETS[0]); // Canvas size
  const [fontSizeOffset, setFontSizeOffset] = useState(0); // Available range: -20 to +20 (approx)
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
    const drawText = text.toUpperCase();
    const lines = drawText.split('\n');
    const scaleFactor = Math.min(width, height) / 128;

    // Start with a reasonable base
    let baseFontSize = 40;
    const maxLineLength = Math.max(...lines.map(l => l.length));
    if (maxLineLength > 5) baseFontSize = 30;
    if (maxLineLength > 10) baseFontSize = 20;
    if (maxLineLength > 20) baseFontSize = 15;

    let fontSize = baseFontSize * scaleFactor;
    ctx.font = `900 ${fontSize}px "Outfit", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif`;

    // Strict Width Constrain: Scale down if any line exceeds 90% of width
    const padding = width * 0.1;
    const maxWidth = width - padding;
    let longestLineWidth = Math.max(...lines.map(l => ctx.measureText(l).width));

    if (longestLineWidth > maxWidth && animationType !== 'slide') {
      const reduction = maxWidth / longestLineWidth;
      fontSize *= reduction;
      ctx.font = `900 ${fontSize}px "Outfit", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif`;
      longestLineWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
    }

    const lineHeight = fontSize * 1.1;

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
      // Calculate how far to slide so it fully clears the screen on both sides
      const fullRange = width + longestLineWidth;
      const offsetX = (fullRange / 2) - (t * fullRange);
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
  }, [text, textColor, bgColor, isTransparent, bgPattern, animationType, fontSizeOffset]);

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
    <div className="min-h-screen bg-[#f1f5f9] text-[#0f172a] font-sans selection:bg-blue-200 selection:text-blue-900 pb-20">

      {/* Header */}
      <header className="p-4 md:p-6 text-center flex flex-row items-center justify-center gap-4 bg-white/80 backdrop-blur-md border-b border-white shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
            Ovice リアクションメーカー
          </h1>
          <p className="hidden md:block text-slate-500 text-sm font-medium">
            バーチャルオフィスで使えるアニメーションGIFを簡単に作成できます
          </p>
        </div>
      </header>

      <main className="w-full max-w-[1400px] px-4 mt-8 flex flex-col lg:flex-row gap-8 items-start justify-center mx-auto">

        {/* Preview Section */}
        <div className="flex flex-col items-center gap-6 w-full lg:w-auto">
          <div className="p-1 rounded-2xl bg-white shadow-2xl border border-blue-100">
            {/* Wrapper to center canvas and show checkerboard */}
            <div className="relative bg-slate-50 rounded-xl overflow-hidden image-pixelated border border-slate-100"
              style={{
                width: currentSize.width,
                height: currentSize.height,
                backgroundImage: `
                      linear-gradient(45deg, #f1f5f9 25%, transparent 25%),
                      linear-gradient(-45deg, #f1f5f9 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #f1f5f9 75%),
                      linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)
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
          <p className="text-xs font-bold font-mono text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">
            {currentSize.width} × {currentSize.height} px
          </p>
        </div>

        {/* Controls Section */}
        <div className="flex-1 w-full bg-white p-8 md:p-10 rounded-[32px] border border-blue-50 flex flex-col gap-8 shadow-2xl shadow-blue-900/5">

          {/* Text Control */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">テキスト入力</label>
              <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1 border border-slate-100">
                <button
                  onClick={() => setFontSizeOffset(prev => prev - 2)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-blue-600 transition-all font-bold"
                  title="Smaller text"
                >
                  -
                </button>
                <span className="text-xs font-bold font-mono w-10 text-center text-slate-600">
                  {fontSizeOffset > 0 ? `+${fontSizeOffset}` : fontSizeOffset}
                </span>
                <button
                  onClick={() => setFontSizeOffset(prev => prev + 2)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-blue-600 transition-all font-bold"
                  title="Larger text"
                >
                  +
                </button>
                <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>
                <button
                  onClick={() => setFontSizeOffset(0)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-blue-600 transition-all"
                  title="Reset size"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                  </svg>
                </button>
              </div>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="メッセージを入力"
              maxLength={30}
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-4 rounded-2xl focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all font-black text-xl resize-none placeholder:text-slate-300"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">アニメーション</label>
              <select
                value={animationType}
                onChange={e => setAnimationType(e.target.value as AnimationType)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 p-4 rounded-2xl focus:outline-none focus:border-blue-400 cursor-pointer font-bold"
              >
                <option value="pulse">パルス（鼓動）</option>
                <option value="spin">回転</option>
                <option value="rainbow">レインボー</option>
                <option value="shake">シェイク（揺れ）</option>
                <option value="slide">スライド</option>
                <option value="bounce">バウンス（跳ね）</option>
                <option value="grow">拡大・縮小</option>
                <option value="blink">点滅</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">背景パターン</label>
              <select
                value={bgPattern}
                onChange={e => setBgPattern(e.target.value as BgPattern)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 p-4 rounded-2xl focus:outline-none focus:border-blue-400 cursor-pointer font-bold"
              >
                <option value="none">なし</option>
                <option value="heart">ハート</option>
                <option value="star">スター</option>
                <option value="burst">バースト（集中線）</option>
                <option value="bubble">吹き出し</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">キャンバスサイズ</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SIZE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setCurrentSize(preset)}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl text-sm font-bold transition-all border-2 ${currentSize.id === preset.id
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-[1.02]'
                    : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-blue-200 hover:bg-white hover:text-blue-600'
                    }`}
                >
                  <span>{preset.label}</span>
                  <span className={`font-mono text-[10px] mt-1 ${currentSize.id === preset.id ? 'opacity-80' : 'opacity-50'}`}>{preset.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-8">
            <div className="flex-1 flex flex-col gap-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">テキストスタイル</label>
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="relative">
                  <input
                    type="color"
                    value={textColor}
                    onChange={e => setTextColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer bg-white border border-slate-200 p-1"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">文字色</span>
                  <span className="font-mono text-sm font-bold text-slate-700">{textColor.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">背景</label>
              <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer select-none group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isTransparent}
                      onChange={e => setIsTransparent(e.target.checked)}
                      className="peer hidden"
                    />
                    <div className="w-12 h-6 bg-slate-200 rounded-full peer-checked:bg-emerald-500 transition-all after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-6"></div>
                  </div>
                  <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">背景を透過させる</span>
                </label>
                {!isTransparent && (
                  <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={e => setBgColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-white border border-slate-200 p-0.5"
                    />
                    <span className="font-mono text-sm font-bold text-slate-700">{bgColor.toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">再生時間（秒）</label>
              <span className="text-xs font-bold font-mono bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{duration}s</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={duration}
              onChange={e => setDuration(parseFloat(e.target.value))}
              className="w-full accent-blue-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <button
            className="group relative mt-4 w-full py-5 text-xl font-black uppercase text-white rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/20 transform transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out -translate-x-full"></div>
            {isGenerating ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                生成中...
              </span>
            ) : 'GIFを生成してダウンロード'}
          </button>
        </div>
      </main>

      <footer className="w-full max-w-[1400px] px-8 flex justify-between items-center text-xs font-bold text-slate-400 mt-16 pb-12 border-t border-slate-100 pt-8 mx-auto">
        <div className="flex items-center gap-4">
          <img src="/footer-logo.png" alt="Avatar" className="w-8 h-8 rounded-full border border-slate-200 shadow-sm" />
          <span>&copy; 2026 サバ缶＠リベ民</span>
          <div className="w-px h-3 bg-slate-200"></div>
          <span className="text-slate-300">コミュニケーションツール用 リアクション作成ツール</span>
        </div>
        <div className="font-mono bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
          v0.3.0-light
        </div>
      </footer>
    </div>
  );
}
