import { useState, useRef, useEffect } from 'react';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import './App.css';

// Types
type AnimationType = 'pulse' | 'spin' | 'rainbow' | 'slide' | 'shake';

function App() {
  const [text, setText] = useState('WOW');
  const [textColor, setTextColor] = useState('#ffffff');
  const [bgColor, setBgColor] = useState('#00000000'); // Transparent by default? Or black?
  const [isTransparent, setIsTransparent] = useState(true);
  const [animationType, setAnimationType] = useState<AnimationType>('pulse');
  // const [fps, setFps] = useState(20);
  const fps = 20;
  const [duration, setDuration] = useState(2); // seconds
  const [isGenerating, setIsGenerating] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Constants
  const SIZE = 128; // Standard emoji size suitable for reaction

  // Render a single frame
  const renderFrame = (
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
    // Start large and shrink
    let fontSize = 40;
    if (text.length > 5) fontSize = 30;
    if (text.length > 8) fontSize = 20;
    // Basic scaling

    ctx.font = `900 ${fontSize}px "Outfit", sans-serif`;

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
      // Loop hue
      const hue = t * 360;
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    } else if (animationType === 'slide') {
      const offsetX = (t - 0.5) * width * 1.5;
      ctx.translate(offsetX, 0);
    }

    // Set Color (if not rainbow override)
    if (animationType !== 'rainbow') {
      ctx.fillStyle = textColor;
    }

    // Draw Text
    ctx.fillText(text, 0, 0);

    // Stroke/Shadow for better visibility ?
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'black';
    if (!isTransparent || textColor !== '#000000') {
      ctx.strokeText(text, 0, 0);
    }

    ctx.restore();
  };

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
  }, [text, textColor, bgColor, isTransparent, animationType, duration]);

  // Generate GIF
  const handleDownload = async () => {
    if (!canvasRef.current) return;
    setIsGenerating(true);

    // Yield to UI to show loading state
    await new Promise(r => setTimeout(r, 100));

    try {
      const gif = new GIFEncoder();
      const frames = fps * duration;
      const width = SIZE;
      const height = SIZE;

      // We need a temporary canvas to read image data
      const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error("No context");

      // Format for gifenc
      // gifenc expects index array + palette
      // But we can use direct rgba? 
      // Actually gifenc 'writeFrame' expects indices. 
      // We need to quantize.

      for (let i = 0; i < frames; i++) {
        const t = i / frames;
        renderFrame(ctx, width, height, t);

        const imageData = ctx.getImageData(0, 0, width, height);
        const { data } = imageData;

        // Quantize
        // quantize(rgba, maxColors) -> [palette, index]
        // But palette needs to be powered of 2 or specific for gifenc?
        // gifenc manual: 
        // const palette = [ ...rgb... ];
        // const index = applyPalette(data, palette);
        // writeFrame(index, width, height, { palette });

        // We use 'quantize' from gifenc or similar library usually.
        // Wait, gifenc readme says:
        /*
          import { GIFEncoder, quantize, applyPalette } from 'gifenc';
          const { data: frameData } = context.getImageData(0, 0, width, height);
          const palette = quantize(frameData, 256);
          const index = applyPalette(frameData, palette);
          gif.writeFrame(index, width, height, { palette, delay: 1000 / fps });
        */

        const palette = quantize(data, 256);
        const index = applyPalette(data, palette);

        // Transparent handling?
        // gifenc supports 'transparent' index options.
        // if isTransparent, we should ensure palette ha a transparent color, or use format 'rgba4444' options?
        // Let's stick to basic for now.
        // If transparent, gifenc 'quantize' handles it if 'format' options are used, or we just trust it.
        // Usually, 0 is transparent if we define it.

        // For basic usage:
        gif.writeFrame(index, width, height, {
          palette,
          delay: (duration * 1000) / frames,
          transparent: isTransparent
        });
      }

      gif.finish();

      const buffer = gif.bytes();
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
    <div className="app-container">
      <header>
        <h1><span className="gradient-text">Ovice</span> Reaction Maker</h1>
        <p className="subtitle">Create animated GIFs for your virtual office reactions!</p>
      </header>

      <main>
        <div className="preview-section">
          <div className="canvas-wrapper">
            <canvas
              ref={previewCanvasRef}
              width={SIZE}
              height={SIZE}
              className="preview-canvas"
            />
            {/* Hidden canvas for generation */}
            <canvas
              ref={canvasRef}
              width={SIZE}
              height={SIZE}
              style={{ display: 'none' }}
            />
          </div>
          <div className="preview-label">Live Preview ({SIZE}x{SIZE})</div>
        </div>

        <div className="controls-section">

          <div className="control-group">
            <label>Text</label>
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value.toUpperCase())}
              maxLength={10}
              placeholder="WOW"
            />
          </div>

          <div className="control-row">
            <div className="control-group">
              <label>Animation</label>
              <select value={animationType} onChange={e => setAnimationType(e.target.value as AnimationType)}>
                <option value="pulse">Pulse</option>
                <option value="spin">Spin</option>
                <option value="rainbow">Rainbow</option>
                <option value="shake">Shake</option>
                <option value="slide">Slide</option>
              </select>
            </div>
          </div>

          <div className="control-row">
            <div className="control-group">
              <label>Text Color</label>
              <div className="color-picker-wrapper">
                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} />
                <span>{textColor}</span>
              </div>
            </div>


            <div className="control-group">
              <label>Background</label>
              <div className="bg-check">
                <input
                  type="checkbox"
                  checked={isTransparent}
                  onChange={e => setIsTransparent(e.target.checked)}
                />
                <span>Transparent</span>
              </div>
              {!isTransparent && (
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} />
              )}
            </div>
          </div>

          <div className="control-row">
            <div className="control-group">
              <label>Duration: {duration}s</label>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={duration}
                onChange={e => setDuration(parseFloat(e.target.value))}
              />
            </div>
            {/* FPS Control could go here but 20 is fine */}
          </div>

          <button
            className="download-btn"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Download GIF'}
          </button>

        </div>
      </main>
    </div>
  )
}

export default App
