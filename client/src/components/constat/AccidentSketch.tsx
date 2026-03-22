import { useRef, useState, useEffect, useCallback } from 'react';

interface Props {
  vehicleTypeA?: string;
  vehicleTypeB?: string;
  sketchImage?: string;
  onChange: (base64: string) => void;
  onContinue: () => void;
}

type Tool = 'pen' | 'stampA' | 'stampB' | 'arrow' | 'road' | 'text' | 'eraser';

const TOOLS: { id: Tool; icon: string; label: string }[] = [
  { id: 'pen',    icon: '✏️', label: 'Crayon' },
  { id: 'stampA', icon: '🅐', label: 'Véhicule A' },
  { id: 'stampB', icon: '🅑', label: 'Véhicule B' },
  { id: 'arrow',  icon: '→',  label: 'Flèche' },
  { id: 'road',   icon: '|',  label: 'Route' },
  { id: 'text',   icon: 'T',  label: 'Texte' },
  { id: 'eraser', icon: '🧹', label: 'Effacer' },
];

const COLORS = ['#F0EDE8', '#FF3500', '#3B82F6', '#22C55E', '#FFB300', '#A855F7'];


// ── Templates de scénarios d'accident ────────────────────────
interface ScenarioTemplate {
  id: string;
  label: string;
  icon: string;
  description: string;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

const ACCIDENT_SCENARIOS: ScenarioTemplate[] = [
  {
    id: 'intersection_priority',
    label: 'Carrefour — priorité',
    icon: '✚',
    description: 'Non-respect de la priorité à droite ou au feu',
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.strokeStyle = 'rgba(240,237,232,0.25)';
      ctx.lineWidth = 14;
      // Route horizontale
      ctx.beginPath(); ctx.moveTo(0, h/2 - 7); ctx.lineTo(w, h/2 - 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, h/2 + 7); ctx.lineTo(w, h/2 + 7); ctx.stroke();
      // Route verticale
      ctx.beginPath(); ctx.moveTo(w/2 - 7, 0); ctx.lineTo(w/2 - 7, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w/2 + 7, 0); ctx.lineTo(w/2 + 7, h); ctx.stroke();
      // Centre
      ctx.fillStyle = 'rgba(240,237,232,0.08)';
      ctx.fillRect(w/2 - 7, h/2 - 7, 14, 14);
    },
  },
  {
    id: 'intersection_t',
    label: 'Intersection en T',
    icon: 'T',
    description: 'Sortie de voie secondaire sur route principale',
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.strokeStyle = 'rgba(240,237,232,0.25)';
      ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(0, h/2 - 7); ctx.lineTo(w, h/2 - 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, h/2 + 7); ctx.lineTo(w, h/2 + 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w/2 - 7, h/2); ctx.lineTo(w/2 - 7, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w/2 + 7, h/2); ctx.lineTo(w/2 + 7, h); ctx.stroke();
    },
  },
  {
    id: 'straight_rear',
    label: 'Ligne droite',
    icon: '⬅',
    description: 'Collision frontale ou arrière sur ligne droite',
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.strokeStyle = 'rgba(240,237,232,0.25)';
      ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(0, h/2 - 20); ctx.lineTo(w, h/2 - 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, h/2 + 20); ctx.lineTo(w, h/2 + 20); ctx.stroke();
      // Ligne médiane pointillée
      ctx.setLineDash([20, 15]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(240,237,232,0.15)';
      ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();
      ctx.setLineDash([]);
    },
  },
  {
    id: 'roundabout',
    label: 'Rond-point',
    icon: '⟳',
    description: 'Accident dans ou à la sortie d'un rond-point',
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.strokeStyle = 'rgba(240,237,232,0.25)';
      ctx.lineWidth = 14;
      // Cercle central
      ctx.beginPath(); ctx.arc(w/2, h/2, 80, 0, Math.PI * 2); ctx.stroke();
      // Entrées/sorties
      const entries: [number, number][] = [[w/2, 0], [w, h/2], [w/2, h], [0, h/2]];
      entries.forEach(([ex, ey]) => {
        const angle = Math.atan2(ey - h/2, ex - w/2);
        const ix = w/2 + Math.cos(angle) * 80;
        const iy = h/2 + Math.sin(angle) * 80;
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ix, iy); ctx.stroke();
      });
    },
  },
  {
    id: 'parking',
    label: 'Parking',
    icon: 'P',
    description: 'Manœuvre de parking, sortie de place',
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.strokeStyle = 'rgba(240,237,232,0.2)';
      ctx.lineWidth = 3;
      // Allée
      ctx.fillStyle = 'rgba(240,237,232,0.05)';
      ctx.fillRect(0, h/2 - 35, w, 70);
      ctx.beginPath(); ctx.moveTo(0, h/2 - 35); ctx.lineTo(w, h/2 - 35); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, h/2 + 35); ctx.lineTo(w, h/2 + 35); ctx.stroke();
      // Places
      for (let i = 0; i < 6; i++) {
        ctx.beginPath(); ctx.moveTo(i * (w/6), h/2 + 35); ctx.lineTo(i * (w/6), h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i * (w/6), h/2 - 35); ctx.lineTo(i * (w/6), 0); ctx.stroke();
      }
    },
  },
  {
    id: 'overtaking',
    label: 'Dépassement',
    icon: '⇉',
    description: 'Collision lors d'un dépassement',
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.strokeStyle = 'rgba(240,237,232,0.25)';
      ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(0, h/2 - 40); ctx.lineTo(w, h/2 - 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, h/2 + 40); ctx.lineTo(w, h/2 + 40); ctx.stroke();
      // Ligne centrale interdite
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255,165,0,0.4)';
      ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();
    },
  },
];

export function AccidentSketch({ sketchImage, onChange, onContinue }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool]       = useState<Tool>('pen');
  const [showTemplates, setShowTemplates] = useState(true); // Afficher d'abord les templates
  const [accidentDesc, setAccidentDesc]   = useState('');   // Description textuelle
  const [color, setColor]     = useState('#F0EDE8');
  const [strokeW, setStrokeW] = useState(3);
  const [drawing, setDrawing] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos]   = useState<{ x: number; y: number } | null>(null);
  const [hasContent, setHasContent] = useState(false);

  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const arrowStart = useRef<{ x: number; y: number } | null>(null);
  const snapshot = useRef<ImageData | null>(null);

  // Init canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    // Dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Grid légère
    ctx.strokeStyle = 'rgba(240,237,232,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    // Restore saved sketch if any
    if (sketchImage) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0); setHasContent(true); };
      img.src = `data:image/png;base64,${sketchImage}`;
    }
  }, []);

  const getPos = (e: React.TouchEvent | React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      // FIX iOS: clientX/clientY sont déjà relatifs au viewport (pas besoin de scroll)
      // rect.left/top incluent le scroll via getBoundingClientRect
      const x = (t.clientX - rect.left) * scaleX;
      const y = (t.clientY - rect.top)  * scaleY;
      return { x: Math.max(0, Math.min(canvas.width,  x)),
               y: Math.max(0, Math.min(canvas.height, y)) };
    }
    const x = ((e as React.MouseEvent).clientX - rect.left) * scaleX;
    const y = ((e as React.MouseEvent).clientY - rect.top)  * scaleY;
    return { x: Math.max(0, Math.min(canvas.width,  x)),
             y: Math.max(0, Math.min(canvas.height, y)) };
  };

  const drawVehicleStamp = (ctx: CanvasRenderingContext2D, x: number, y: number, role: 'A' | 'B') => {
    const c = role === 'A' ? '#3B82F6' : '#FF6B00';
    const w = 50, h = 28;
    ctx.save();
    ctx.translate(x - w / 2, y - h / 2);
    // Car body
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.rect(0, h * 0.35, w, h * 0.55);
    ctx.fill();
    // Roof
    ctx.beginPath();
    ctx.rect(w * 0.15, h * 0.1, w * 0.7, h * 0.35);
    ctx.fill();
    // Wheels
    ctx.fillStyle = '#0a0a18';
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    [[w * 0.18, h * 0.9], [w * 0.82, h * 0.9]].forEach(([wx, wy]) => {
      ctx.beginPath(); ctx.arc(wx, wy, 6, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    });
    // Label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(role, w / 2, h * 0.72);
    ctx.restore();
    setHasContent(true);
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    const headLen = 16;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const onStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);

    if (tool === 'text') {
      setTextPos(pos);
      setTextMode(true);
      return;
    }
    if (tool === 'stampA') { drawVehicleStamp(ctx, pos.x, pos.y, 'A'); onChange(canvas.toDataURL('image/png').split(',')[1]); return; }
    if (tool === 'stampB') { drawVehicleStamp(ctx, pos.x, pos.y, 'B'); onChange(canvas.toDataURL('image/png').split(',')[1]); return; }

    setDrawing(true);
    lastPos.current = pos;
    if (tool === 'arrow' || tool === 'road') {
      arrowStart.current = pos;
      snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#1a1a2e' : color;
    ctx.lineWidth = tool === 'eraser' ? 24 : strokeW;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [tool, color, strokeW, onChange]);

  const onMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!drawing || !lastPos.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);

    if (tool === 'arrow' || tool === 'road') {
      if (snapshot.current) ctx.putImageData(snapshot.current, 0, 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'round';
      if (tool === 'arrow') {
        drawArrow(ctx, arrowStart.current!.x, arrowStart.current!.y, pos.x, pos.y);
      } else {
        // Road = double line
        ctx.beginPath();
        ctx.moveTo(arrowStart.current!.x - 6, arrowStart.current!.y);
        ctx.lineTo(pos.x - 6, pos.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(arrowStart.current!.x + 6, arrowStart.current!.y);
        ctx.lineTo(pos.x + 6, pos.y);
        ctx.stroke();
        // Dashes center
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.moveTo(arrowStart.current!.x, arrowStart.current!.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      return;
    }

    ctx.strokeStyle = tool === 'eraser' ? '#1a1a2e' : color;
    ctx.lineWidth = tool === 'eraser' ? 24 : strokeW;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasContent(true);
  }, [drawing, tool, color, strokeW]);

  const onEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!drawing) return;
    setDrawing(false);
    lastPos.current = null;
    arrowStart.current = null;
    snapshot.current = null;
    const canvas = canvasRef.current!;
    onChange(canvas.toDataURL('image/png').split(',')[1]);
    setHasContent(true);
  }, [drawing, onChange]);

  const confirmText = () => {
    if (!textInput.trim() || !textPos) { setTextMode(false); return; }
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.font = `${strokeW * 4 + 10}px sans-serif`;
    ctx.fillText(textInput, textPos.x, textPos.y);
    setTextMode(false);
    setTextInput('');
    setTextPos(null);
    onChange(canvas.toDataURL('image/png').split(',')[1]);
    setHasContent(true);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(240,237,232,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    setHasContent(false);
    onChange('');
  };

  const applyTemplate = (scenario: typeof ACCIDENT_SCENARIOS[0]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    scenario.draw(ctx, canvas.width, canvas.height);
    onChange(canvas.toDataURL('image/png').split(',')[1]);
    setHasContent(true);
    setShowTemplates(false);
  };

  return (
    <div style={{ padding: '16px 20px', maxWidth: 420, margin: '0 auto' }}>

      {/* Description textuelle */}
      <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          💬 Description de l&apos;accident (optionnel)
        </div>
        <textarea
          value={accidentDesc}
          onChange={e => setAccidentDesc(e.target.value)}
          placeholder="Ex: Au carrefour, B n'a pas respecté ma priorité. — Dépassement en ligne blanche. — Marche arrière dans parking…"
          rows={3}
          style={{ width:'100%', padding:'9px 11px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box', resize:'none', fontFamily:'inherit', lineHeight:1.5 }}
        />
      </div>

      {/* Templates ou dessin libre */}
      {showTemplates ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            🗺️ Choisissez un modèle de scène
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
            {ACCIDENT_SCENARIOS.map(s => (
              <button key={s.id} onClick={() => applyTemplate(s)}
                style={{ padding:'10px 6px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', cursor:'pointer', textAlign:'center', touchAction:'manipulation', WebkitTapHighlightColor:'transparent' as any }}>
                <div style={{ fontSize:20, marginBottom:3 }}>{s.icon}</div>
                <div style={{ fontSize:10, fontWeight:600, color:'var(--text)', marginBottom:2 }}>{s.label}</div>
                <div style={{ fontSize:9, opacity:0.4, lineHeight:1.3 }}>{s.description}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setShowTemplates(false)}
            style={{ width:'100%', padding:'9px', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', background:'transparent', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:12, touchAction:'manipulation' }}>
            Dessin libre sans modèle →
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
          <button onClick={() => setShowTemplates(true)}
            style={{ padding:'5px 10px', borderRadius:6, border:'1px solid rgba(255,255,255,0.08)', background:'transparent', cursor:'pointer', fontSize:11, color:'rgba(255,255,255,0.4)', touchAction:'manipulation' }}>
            ← Modèles
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>✏️ Croquis de l'accident</h2>
        <p style={{ fontSize: 12, opacity: 0.45, lineHeight: 1.5 }}>Section 13 — Dessinez la position des véhicules, les flèches de direction et les éléments importants.</p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {TOOLS.map(t => (
          <button key={t.id} onClick={() => { setTool(t.id); setTextMode(false); }}
            title={t.label}
            style={{
              padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tool === t.id ? 'var(--boom)' : 'rgba(240,237,232,0.08)',
              color: tool === t.id ? '#fff' : 'var(--text)',
              fontSize: t.id === 'arrow' || t.id === 'road' || t.id === 'text' ? 14 : 16,
              fontWeight: 700, minWidth: 36, transition: 'all 0.15s',
            }}>
            {t.icon}
          </button>
        ))}
        <button onClick={clearCanvas} title="Tout effacer"
          style={{ padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 13, fontWeight: 700, marginLeft: 'auto' }}>
          ✕ Effacer tout
        </button>
      </div>

      {/* Color + stroke */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)}
            style={{ width: 24, height: 24, borderRadius: '50%', border: `2.5px solid ${color === c ? '#fff' : 'transparent'}`, background: c, cursor: 'pointer', flexShrink: 0 }} />
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, opacity: 0.4 }}>Épaisseur</span>
          {[2, 4, 7].map(w => (
            <button key={w} onClick={() => setStrokeW(w)}
              style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${strokeW === w ? 'var(--boom)' : 'rgba(240,237,232,0.2)'}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: w * 2, height: w * 2, borderRadius: '50%', background: 'var(--text)' }} />
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(240,237,232,0.1)', marginBottom: 14 }}>
        <canvas
          ref={canvasRef}
          width={760}
          height={540}
          style={{ width: '100%', display: 'block', cursor: tool === 'eraser' ? 'cell' : tool === 'stampA' || tool === 'stampB' ? 'copy' : 'crosshair', touchAction: 'none' }}
          onMouseDown={onStart}
          onMouseMove={onMove}
          onMouseUp={onEnd}
          onMouseLeave={onEnd}
          onTouchStart={onStart}
          onTouchMove={onMove}
          onTouchEnd={onEnd}
        />
        {/* Text input overlay */}
        {textMode && textPos && (
          <div style={{ position: 'absolute', top: `${(textPos.y / 540) * 100}%`, left: `${(textPos.x / 760) * 100}%`, zIndex: 10 }}>
            <input
              autoFocus
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmText(); if (e.key === 'Escape') setTextMode(false); }}
              placeholder="Texte..."
              style={{ background: 'rgba(14,14,24,0.9)', border: '1px solid var(--boom)', borderRadius: 6, padding: '4px 8px', color: color, fontSize: strokeW * 4 + 10, outline: 'none', minWidth: 100 }}
            />
            <button onClick={confirmText} style={{ marginLeft: 4, background: 'var(--boom)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>✓</button>
          </div>
        )}
      </div>

      {/* Tool hint */}
      <div style={{ fontSize: 11, opacity: 0.35, marginBottom: 16, textAlign: 'center' }}>
        {tool === 'stampA' && 'Touchez pour placer le véhicule A (bleu)'}
        {tool === 'stampB' && 'Touchez pour placer le véhicule B (orange)'}
        {tool === 'arrow'  && 'Tracez une flèche pour indiquer la direction'}
        {tool === 'road'   && 'Tracez une double ligne pour indiquer la route'}
        {tool === 'text'   && 'Touchez pour ajouter du texte'}
        {tool === 'eraser' && 'Effacez des zones du croquis'}
        {tool === 'pen'    && 'Dessin libre — indiquez tous les détails utiles'}
      </div>

      {/* Continue */}
      <button onClick={onContinue} style={{
        width: '100%', padding: '16px', borderRadius: 12, border: 'none',
        background: 'var(--boom)', color: '#fff', cursor: 'pointer',
        fontSize: 15, fontWeight: 700,
      }}>
        {hasContent ? 'Croquis enregistré → Continuer' : 'Passer (sans croquis) →'}
      </button>
    </div>
  );
}
