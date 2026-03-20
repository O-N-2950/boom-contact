import { useRef, useState, useEffect, useCallback } from 'react';

interface Props {
  onExport?: (dataUrl: string) => void;
}

type Tool = 'pen' | 'arrow' | 'rect' | 'eraser';

interface Point { x: number; y: number; }
interface Stroke {
  tool: Tool;
  color: string;
  width: number;
  points: Point[];
}

const SYMBOLS = [
  { emoji: '🚗', label: 'Véhicule' },
  { emoji: '🏠', label: 'Bâtiment' },
  { emoji: '🚦', label: 'Feu' },
  { emoji: '🛑', label: 'Stop' },
  { emoji: '⬆️', label: 'Direction' },
  { emoji: '↗️', label: 'Bifurc.' },
];

export function SketchCanvas({ onExport }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#FF3500');
  const [lineWidth, setLineWidth] = useState(3);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [drawing, setDrawing] = useState(false);
  const currentStroke = useRef<Stroke | null>(null);

  const COLORS = ['#FF3500', '#FFB300', '#22c55e', '#3b82f6', '#a855f7', '#F0EDE8', '#06060C'];

  const getPos = (e: React.TouchEvent | React.MouseEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  const redrawAll = useCallback((strokeList: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#0E0E18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(240,237,232,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Draw all strokes
    for (const stroke of strokeList) {
      if (stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      } else if (stroke.tool === 'rect') {
        const [a, b] = [stroke.points[0], stroke.points[stroke.points.length - 1]];
        ctx.beginPath();
        ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      } else if (stroke.tool === 'arrow') {
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = 14;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    }
  }, []);

  useEffect(() => { redrawAll(strokes); }, [strokes, redrawAll]);

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    currentStroke.current = {
      tool,
      color: tool === 'eraser' ? '#0E0E18' : color,
      width: tool === 'eraser' ? 20 : lineWidth,
      points: [pos],
    };
    setDrawing(true);
  };

  const moveDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!drawing || !currentStroke.current) return;
    const pos = getPos(e);
    currentStroke.current.points.push(pos);

    // Live preview
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const s = currentStroke.current;
    if (s.tool === 'pen' || s.tool === 'eraser') {
      const pts = s.points;
      if (pts.length >= 2) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
      }
    } else {
      redrawAll([...strokes, s]);
    }
  };

  const endDraw = () => {
    if (!drawing || !currentStroke.current) return;
    if (currentStroke.current.points.length >= 2) {
      const newStrokes = [...strokes, currentStroke.current];
      setStrokes(newStrokes);
      setRedoStack([]);
      redrawAll(newStrokes);
    }
    currentStroke.current = null;
    setDrawing(false);
  };

  const undo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    const newStrokes = strokes.slice(0, -1);
    setRedoStack(r => [...r, last]);
    setStrokes(newStrokes);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setStrokes(s => [...s, last]);
    setRedoStack(r => r.slice(0, -1));
  };

  const clear = () => { setStrokes([]); setRedoStack([]); };

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    onExport?.(url);
  };

  const TOOLS: { id: Tool; icon: string; label: string }[] = [
    { id: 'pen',    icon: '✏️', label: 'Crayon' },
    { id: 'arrow',  icon: '➡️', label: 'Flèche' },
    { id: 'rect',   icon: '⬜', label: 'Rectangle' },
    { id: 'eraser', icon: '🧹', label: 'Gomme' },
  ];

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>✏️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Croquis de l'accident</div>
          <div style={{ fontSize: 11, opacity: 0.45 }}>Dessinez la scène librement</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {TOOLS.map(t => (
          <button key={t.id} onClick={() => setTool(t.id)} style={{
            padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
            background: tool === t.id ? 'var(--boom)' : 'rgba(255,255,255,0.06)',
            color: tool === t.id ? '#fff' : 'var(--text)',
            fontWeight: tool === t.id ? 700 : 400,
            transition: 'all 0.15s',
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Colors */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
        {COLORS.map(c => (
          <button key={c} onClick={() => { setColor(c); setTool('pen'); }} style={{
            width: 24, height: 24, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
            outline: color === c && tool !== 'eraser' ? '2px solid rgba(255,255,255,0.6)' : '2px solid transparent',
            outlineOffset: 2, transition: 'transform 0.15s',
          }} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')} onMouseLeave={e => (e.currentTarget.style.transform = '')} />
        ))}
        {/* Size */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {[2, 4, 7].map(w => (
            <button key={w} onClick={() => setLineWidth(w)} style={{
              width: w + 16, height: w + 16, borderRadius: '50%', background: lineWidth === w ? 'var(--text)' : 'rgba(255,255,255,0.25)',
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            }} />
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', touchAction: 'none', marginBottom: 10 }}>
        <canvas
          ref={canvasRef}
          width={600} height={320}
          style={{ width: '100%', height: 'auto', display: 'block', cursor: tool === 'eraser' ? 'cell' : 'crosshair', touchAction: 'none' }}
          onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw}
        />
      </div>

      {/* Symbols */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, opacity: 0.4, letterSpacing: 2, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', marginBottom: 6 }}>Symboles</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SYMBOLS.map(sym => (
            <button key={sym.emoji} title={sym.label} style={{
              padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)', cursor: 'pointer', fontSize: 16,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,53,0,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onClick={() => {
              // Add symbol to canvas as text
              const canvas = canvasRef.current;
              if (!canvas) return;
              const ctx = canvas.getContext('2d')!;
              ctx.font = '40px serif';
              ctx.fillText(sym.emoji, canvas.width / 2 + (Math.random() - 0.5) * 200, canvas.height / 2 + (Math.random() - 0.5) * 100);
            }}>
              {sym.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={undo} disabled={strokes.length === 0} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text)', cursor: strokes.length === 0 ? 'not-allowed' : 'pointer', opacity: strokes.length === 0 ? 0.3 : 1, fontSize: 13 }}>↩ Annuler</button>
        <button onClick={redo} disabled={redoStack.length === 0} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text)', cursor: redoStack.length === 0 ? 'not-allowed' : 'pointer', opacity: redoStack.length === 0 ? 0.3 : 1, fontSize: 13 }}>↪ Refaire</button>
        <button onClick={clear} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>🗑 Effacer</button>
        {onExport && (
          <button onClick={exportPNG} style={{ padding: '10px 14px', borderRadius: 8, border: 'none', background: 'var(--boom)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>✅ OK</button>
        )}
      </div>
    </div>
  );
}
