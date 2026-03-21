import { useRef, useEffect, useState, useCallback } from 'react';

interface Props {
  role: string;
  onSign: (signatureBase64: string) => void;
  otherSigned: boolean;
}

export function SignaturePad({ role, onSign, otherSigned }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const [signing, setSigning]   = useState(false);
  const [signed, setSigned]     = useState(false);
  const [isEmpty, setIsEmpty]   = useState(true);
  const drawing      = useRef(false);
  const lastPoint    = useRef<{ x: number; y: number } | null>(null);
  const roleColor    = role === 'A' ? '#FF3500' : '#00E5FF';

  // ── Canvas context init ────────────────────────────────────
  const initCtx = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#06060C';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = roleColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap   = 'round';
    ctx.lineJoin  = 'round';
  }, [roleColor]);

  // ── ResizeObserver — adapte le canvas sans déformer ────────
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas  = canvasRef.current;
    if (!wrapper || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;

        // Conserver le dessin existant avant resize
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width  = canvas.width;
        tempCanvas.height = canvas.height;
        tempCanvas.getContext('2d')!.drawImage(canvas, 0, 0);

        // Redimensionner canvas en tenant compte du DPR
        const cssHeight = Math.round(width * 0.45); // ratio 45% de la largeur
        canvas.width  = Math.round(width * dpr);
        canvas.height = Math.round(cssHeight * dpr);
        canvas.style.width  = `${width}px`;
        canvas.style.height = `${cssHeight}px`;

        // Reinit context (resetté après resize)
        initCtx(canvas);

        // Restaurer le dessin (scalé à la nouvelle taille)
        if (!isEmpty) {
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
        }
      }
    });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [initCtx, isEmpty]);

  // ── Coordonnées corrigées pour DPR ────────────────────────
  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const dpr    = window.devicePixelRatio || 1;
    // Multiplier par DPR pour que les coords correspondent aux pixels canvas
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: (clientX - rect.left)  * dpr,
      y: (clientY - rect.top)   * dpr,
    };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    if (signed) return;
    e.preventDefault();
    drawing.current   = true;
    lastPoint.current = getPos(e);
    setIsEmpty(false);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawing.current || signed) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    const point  = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current!.x, lastPoint.current!.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint.current = point;
  };

  const endDraw = () => { drawing.current = false; };

  const clear = () => {
    if (signed) return;
    const canvas = canvasRef.current!;
    initCtx(canvas);
    setIsEmpty(true);
  };

  const confirmSign = async () => {
    if (isEmpty || signed) return;
    setSigning(true);
    const canvas = canvasRef.current!;
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    await new Promise(r => setTimeout(r, 300));
    setSigned(true);
    setSigning(false);
    onSign(base64);
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          Signature — Conducteur {role}
        </h3>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
          {[
            { label: `Conducteur ${role}`,                   done: signed },
            { label: `Conducteur ${role === 'A' ? 'B' : 'A'}`, done: otherSigned },
          ].map((p, i) => (
            <div key={i} style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontFamily: 'monospace',
              background: p.done ? 'rgba(34,197,94,0.15)' : i === 0 ? 'rgba(255,53,0,0.1)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${p.done ? 'rgba(34,197,94,0.3)' : i === 0 ? 'rgba(255,53,0,0.2)' : 'rgba(255,255,255,0.1)'}`,
              color: p.done ? '#22c55e' : i === 0 ? 'var(--boom)' : 'rgba(240,237,232,0.4)',
            }}>
              {p.done ? '✅' : '⏳'} {p.label}
            </div>
          ))}
        </div>
      </div>

      {/* Wrapper observé par ResizeObserver */}
      <div
        ref={wrapperRef}
        style={{
          position: 'relative',
          borderRadius: 12,
          overflow: 'hidden',
          border: `2px solid ${signed ? 'rgba(34,197,94,0.4)' : `${roleColor}33`}`,
          marginBottom: 14,
          width: '100%',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            touchAction: 'none',
            cursor: signed ? 'default' : 'crosshair',
            width: '100%',   // CSS width — ResizeObserver gère le canvas interne
          }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {isEmpty && !signed && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ fontSize: 13, opacity: 0.2, fontStyle: 'italic' }}>Signez ici avec votre doigt</span>
          </div>
        )}
        {signed && (
          <div style={{ position: 'absolute', top: 8, right: 8, padding: '3px 8px', borderRadius: 4, background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', fontSize: 10, color: '#22c55e', fontFamily: 'monospace', letterSpacing: 1 }}>
            SIGNÉ ✓
          </div>
        )}
      </div>

      {!signed && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={clear} style={{ flex: 1, padding: '13px', borderRadius: 10, border: '1.5px solid rgba(240,237,232,0.12)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
            🗑 Effacer
          </button>
          <button onClick={confirmSign} disabled={isEmpty || signing} style={{ flex: 2, padding: '13px', borderRadius: 10, border: 'none', background: isEmpty ? 'rgba(255,53,0,0.3)' : 'var(--boom)', color: '#fff', cursor: isEmpty ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, transition: 'all 0.2s' }}>
            {signing ? '⏳ Enregistrement…' : '✍️ Confirmer la signature'}
          </button>
        </div>
      )}

      {signed && !otherSigned && (
        <div style={{ padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', textAlign: 'center' }}>
          <div style={{ fontSize: 22, marginBottom: 6 }}>⏳</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>En attente de la signature de l'autre conducteur…</div>
          <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>Le PDF sera généré dès que les deux parties auront signé.</div>
        </div>
      )}

      {signed && otherSigned && (
        <div style={{ padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🎉</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#22c55e' }}>Constat signé par les deux parties !</div>
          <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>Génération du PDF en cours…</div>
        </div>
      )}
    </div>
  );
}
